import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { PublicSurvey } from '@app/contracts';
import { validateSubmission } from '@app/logic-engine';
import { PrismaService } from '../shared/db/prisma.service';
import { buildResponseHashPayloadV1, computeResponseHashNode } from '@app/canonicalization';
import type { Prisma } from '@prisma/client';
import type { ResponseValidationError } from './response-errors';
import { toBadRequestDetails } from './response-errors';
import { logResponseSubmitted } from '../shared/logging/events';

export type SubmitResponseInput = {
  slug: string;
  requesterUserId: string | null;
  answers: Array<{ question_id: string; value: unknown }>;
};

@Injectable()
export class ResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(input: SubmitResponseInput) {
    const survey = await this.prisma.survey.findUnique({
      where: { slug: input.slug },
      include: {
        questions: { include: { options: true }, orderBy: { order: 'asc' } },
        ruleGroups: { include: { rules: true }, orderBy: { order: 'asc' } }
      }
    });

    if (!survey || survey.status !== 'PUBLISHED' || !survey.publishHash) {
      throw new NotFoundException('Survey not found');
    }

    const publishHash = survey.publishHash;

    const respondentId = survey.isAnonymous ? null : input.requesterUserId;
    if (!survey.isAnonymous && !respondentId) {
      throw new UnauthorizedException('Authentication required');
    }

    const publicSurvey: Pick<PublicSurvey, 'questions' | 'rule_groups'> = {
      questions: survey.questions.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description ?? undefined,
        type: q.type,
        required: q.required,
        options: q.options.length
          ? q.options
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((o) => ({ id: o.id, label: o.label, value: o.value }))
          : undefined
      })),
      rule_groups: survey.ruleGroups.map((g) => ({
        id: g.id,
        target_question_id: g.targetQuestionId,
        action: g.action === 'SHOW' ? 'show' : 'hide',
        mode: g.operator,
        rules: g.rules
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((r) => ({
            id: r.id,
            source_question_id: r.sourceQuestionId,
            operator:
              r.operator === 'EQUALS' ? 'equals' : r.operator === 'NOT_EQUALS' ? 'not_equals' : 'contains',
            value: r.valueJson
          }))
      }))
    };

    const answersMap: Record<string, unknown> = {};
    for (const a of input.answers) {
      answersMap[a.question_id] = a.value;
    }

    const validation = validateSubmission(publicSurvey, answersMap);
    const extraErrors = this.validateAnswerTypes(publicSurvey, answersMap, validation.visibleQuestionIds);

    const errors: ResponseValidationError[] = [
      ...validation.errors.map((e) => ({
        code: e.code as ResponseValidationError['code'],
        message: e.message,
        question_id: e.question_id
      })),
      ...extraErrors
    ];

    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Validation failed', details: toBadRequestDetails(errors) });
    }

    const acceptedAnswers: Record<string, unknown> = {};
    for (const qid of validation.visibleQuestionIds) {
      if (qid in answersMap) {
        acceptedAnswers[qid] = answersMap[qid];
      }
    }

    const payload = buildResponseHashPayloadV1({
      survey_id: survey.id,
      publish_hash: publishHash,
      respondent_id: respondentId,
      answers: acceptedAnswers
    });

    const responseHash = computeResponseHashNode(payload);

    const created = await this.prisma.$transaction(async (tx) => {
      const response = await tx.response.create({
        data: {
          surveyId: survey.id,
          publishHash,
          responseHash,
          respondentId
        }
      });

      const rows: Array<{ responseId: string; questionId: string; valueJson: Prisma.InputJsonValue }> =
        Object.entries(acceptedAnswers).map(([questionId, value]) => ({
        responseId: response.id,
        questionId,
        valueJson: value as Prisma.InputJsonValue
      }));

      if (rows.length) {
        await tx.answer.createMany({ data: rows });
      }

      return response;
    });

    logResponseSubmitted({ survey_id: survey.id, response_id: created.id, publish_hash: publishHash });

    return {
      response_id: created.id,
      publish_hash: publishHash,
      response_hash: responseHash
    };
  }

  private validateAnswerTypes(
    survey: Pick<PublicSurvey, 'questions'>,
    answers: Record<string, unknown>,
    visibleQuestionIds: Set<string>
  ): ResponseValidationError[] {
    const errors: ResponseValidationError[] = [];

    for (const q of survey.questions) {
      if (!visibleQuestionIds.has(q.id)) continue;
      if (!(q.id in answers)) continue;

      const v = answers[q.id];

      if (q.type === 'SC') {
        if (typeof v !== 'string') {
          errors.push({ code: 'INVALID_ANSWER_TYPE', message: 'Expected string', question_id: q.id });
          continue;
        }
        const allowed = new Set((q.options ?? []).map((o) => o.value));
        if (allowed.size > 0 && !allowed.has(v)) {
          errors.push({ code: 'INVALID_OPTION_VALUE', message: 'Invalid option value', question_id: q.id });
        }
      }

      if (q.type === 'MC') {
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
          errors.push({ code: 'INVALID_ANSWER_TYPE', message: 'Expected array of strings', question_id: q.id });
          continue;
        }
        const allowed = new Set((q.options ?? []).map((o) => o.value));
        if (allowed.size > 0) {
          for (const item of v) {
            if (!allowed.has(item)) {
              errors.push({ code: 'INVALID_OPTION_VALUE', message: 'Invalid option value', question_id: q.id });
              break;
            }
          }
        }
      }

      if (q.type === 'TEXT') {
        if (typeof v !== 'string') {
          errors.push({ code: 'INVALID_ANSWER_TYPE', message: 'Expected string', question_id: q.id });
        }
      }

      if (q.type === 'NUMBER' || q.type === 'RATING') {
        if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) {
          errors.push({ code: 'INVALID_ANSWER_TYPE', message: 'Expected number', question_id: q.id });
        }
      }

      if (q.type === 'MATRIX') {
        if (!v || typeof v !== 'object' || Array.isArray(v)) {
          errors.push({ code: 'INVALID_MATRIX_VALUE', message: 'Expected object', question_id: q.id });
        }
      }
    }

    return errors;
  }
}
