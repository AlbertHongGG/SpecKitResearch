import { Injectable } from '@nestjs/common';

import type {
  GroupOperator,
  QuestionType,
  RuleAction,
  RuleOperator,
  SurveySnapshot,
} from '@acme/logic-engine';
import { computeResponseHash } from '@acme/logic-engine/server';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  async createResponse(params: {
    surveyId: string;
    surveyPublishId: string;
    publishHash: string;
    respondentId: string | null;
    snapshot: SurveySnapshot;
    canonicalAnswersById: Record<string, unknown>;
  }) {
    const orderByQuestionId = new Map(params.snapshot.questions.map((q) => [q.id, q.order] as const));

    const answersToStore = Object.entries(params.canonicalAnswersById)
      .filter(([, v]) => typeof v !== 'undefined')
      .map(([question_id, value]) => ({ question_id, value }))
      .sort((a, b) => (orderByQuestionId.get(a.question_id) ?? 0) - (orderByQuestionId.get(b.question_id) ?? 0));

    const responseHashPayload = {
      survey_id: params.surveyId,
      publish_hash: params.publishHash,
      respondent_id: params.respondentId,
      answers: answersToStore,
    };

    const response_hash = computeResponseHash(responseHashPayload);

    const created = await this.prisma.$transaction(async (tx) => {
      const response = await tx.response.create({
        data: {
          survey_id: params.surveyId,
          survey_publish_id: params.surveyPublishId,
          respondent_id: params.respondentId,
          publish_hash: params.publishHash,
          response_hash,
        },
      });

      if (answersToStore.length > 0) {
        await tx.answer.createMany({
          data: answersToStore.map((a) => ({
            response_id: response.id,
            question_id: a.question_id,
            value: a.value as Prisma.InputJsonValue,
          })),
        });
      }

      return response;
    });

    return {
      response_id: created.id,
      response_hash,
      submitted_at: created.submitted_at.toISOString(),
    };
  }

  buildSnapshotFromPublish(params: {
    publishHash: string;
    schemaJson: unknown;
  }): SurveySnapshot {
    type PublishSchemaQuestion = {
      id: string;
      type: QuestionType;
      title: string;
      is_required: boolean;
      order: number;
    };
    type PublishSchemaRule = {
      id: string;
      source_question_id: string;
      operator: RuleOperator;
      value: string;
    };
    type PublishSchemaRuleGroup = {
      id: string;
      target_question_id: string;
      action: RuleAction;
      group_operator: GroupOperator;
      rules?: PublishSchemaRule[];
    };
    type PublishSchema = {
      survey: {
        id: string;
        slug: string;
        title: string;
        description?: string | null;
        is_anonymous?: boolean;
        status: SurveySnapshot['survey']['status'];
      };
      questions?: PublishSchemaQuestion[];
      rule_groups?: PublishSchemaRuleGroup[];
    };

    const schema = params.schemaJson as unknown as PublishSchema;

    return {
      survey: {
        id: schema.survey.id,
        slug: schema.survey.slug,
        title: schema.survey.title,
        description: schema.survey.description ?? null,
        is_anonymous: Boolean(schema.survey.is_anonymous),
        status: schema.survey.status,
      },
      publish_hash: params.publishHash,
      questions: (schema.questions ?? []).map((q) => ({
        id: q.id,
        type: q.type,
        title: q.title,
        is_required: q.is_required,
        order: q.order,
      })),
      rule_groups: (schema.rule_groups ?? []).map((g) => ({
        id: g.id,
        target_question_id: g.target_question_id,
        action: g.action,
        group_operator: g.group_operator,
        rules: (g.rules ?? []).map((r) => ({
          id: r.id,
          source_question_id: r.source_question_id,
          operator: r.operator,
          value: r.value,
        })),
      })),
    };
  }
}
