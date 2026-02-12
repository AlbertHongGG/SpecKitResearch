import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { computePublishHash } from '@acme/logic-engine/server';
import type { SurveySnapshot } from '@acme/logic-engine';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { incCounter } from '../common/metrics';
import { logInfo, logWarn } from '../common/logger';
import { validateDraftSnapshot } from './validateDraft';

function stableSort<T>(items: T[], compare: (a: T, b: T) => number): T[] {
  return [...items].sort(compare);
}

@Injectable()
export class PublishService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(surveyId: string): Promise<{ status: 'Published'; publish_hash: string }> {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: { orderBy: { order: 'asc' }, include: { options: true } },
        rule_groups: { include: { rules: true } },
      },
    });

    if (!survey) throw new NotFoundException('Survey not found');

    if (survey.status !== 'Draft') {
      throw new ConflictException('Only Draft surveys can be published');
    }

    const questions = survey.questions.map((q) => ({
      id: q.id,
      survey_id: q.survey_id,
      type: q.type,
      title: q.title,
      is_required: q.is_required,
      order: q.order,
    }));

    const options = stableSort(
      survey.questions.flatMap((q) => q.options.map((o) => ({
        id: o.id,
        question_id: o.question_id,
        label: o.label,
        value: o.value,
      }))),
      (a, b) => {
        const qa = questions.find((q) => q.id === a.question_id)?.order ?? 0;
        const qb = questions.find((q) => q.id === b.question_id)?.order ?? 0;
        if (qa !== qb) return qa - qb;
        if (a.value !== b.value) return a.value.localeCompare(b.value);
        return a.id.localeCompare(b.id);
      },
    );

    const rule_groups = stableSort(
      survey.rule_groups.map((g) => ({
        id: g.id,
        target_question_id: g.target_question_id,
        action: g.action,
        group_operator: g.group_operator,
        rules: stableSort(
          g.rules.map((r) => ({
            id: r.id,
            source_question_id: r.source_question_id,
            operator: r.operator,
            value: r.value,
          })),
          (a, b) => a.id.localeCompare(b.id),
        ),
      })),
      (a, b) => a.id.localeCompare(b.id),
    );

    const snapshotForValidation: SurveySnapshot = {
      survey: {
        id: survey.id,
        slug: survey.slug,
        title: survey.title,
        description: survey.description ?? null,
        is_anonymous: survey.is_anonymous,
        status: 'Draft',
      },
      publish_hash: 'draft',
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        title: q.title,
        is_required: q.is_required,
        order: q.order,
      })),
      rule_groups,
    };

    const validation = validateDraftSnapshot(snapshotForValidation);
    if (!validation.ok) {
      incCounter('publish_validation_error');
      logWarn('publish_validation_error', { surveyId, error_count: validation.errors.length });
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const schema_json = {
      survey: {
        id: survey.id,
        slug: survey.slug,
        title: survey.title,
        description: survey.description ?? null,
        is_anonymous: survey.is_anonymous,
        status: 'Published' as const,
      },
      questions,
      options,
      rule_groups,
    };

    const publish_hash = computePublishHash(schema_json);

    await this.prisma.$transaction(async (tx) => {
      await tx.survey.update({
        where: { id: survey.id },
        data: {
          status: 'Published',
          publish_hash,
        },
      });

      await tx.surveyPublish.create({
        data: {
          survey_id: survey.id,
          publish_hash,
          schema_json: schema_json as Prisma.InputJsonValue,
        },
      });
    });

    incCounter('publish_success');
    logInfo('publish_success', { surveyId, publish_hash });

    return { status: 'Published', publish_hash };
  }

  async close(surveyId: string): Promise<{ status: 'Closed' }> {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      select: { id: true, status: true, publish_hash: true },
    });

    if (!survey) throw new NotFoundException('Survey not found');

    if (survey.status !== 'Published') {
      throw new ConflictException('Only Published surveys can be closed');
    }

    await this.prisma.survey.update({
      where: { id: survey.id },
      data: { status: 'Closed' },
    });

    logInfo('close_success', { surveyId });

    return { status: 'Closed' };
  }
}
