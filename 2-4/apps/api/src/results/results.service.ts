import { Injectable, NotFoundException } from '@nestjs/common';

import { incCounter } from '../common/metrics';
import { PrismaService } from '../prisma/prisma.service';

type Aggregate = { question_id: string; type: string; data: unknown };

function toIso(date: Date): string {
  return date.toISOString();
}

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async getResults(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      select: {
        id: true,
        owner_user_id: true,
        slug: true,
        title: true,
        description: true,
        is_anonymous: true,
        status: true,
        publish_hash: true,
        created_at: true,
      },
    });

    if (!survey) throw new NotFoundException('Survey not found');
    if ((survey.status !== 'Published' && survey.status !== 'Closed') || !survey.publish_hash) {
      throw new NotFoundException('Survey not found');
    }

    const publish = await this.prisma.surveyPublish.findUnique({
      where: { publish_hash: survey.publish_hash },
      select: { id: true, publish_hash: true, schema_json: true },
    });

    if (!publish) throw new NotFoundException('Survey not found');

    type PublishSchemaQuestion = {
      id: string;
      type: string;
      title: string;
      is_required: boolean;
      order: number;
    };
    const schema = publish.schema_json as unknown as { questions?: PublishSchemaQuestion[] };
    const questions: Array<{ id: string; type: string; title: string; is_required: boolean; order: number }> =
      (schema.questions ?? []).map((q) => ({
        id: q.id,
        type: q.type,
        title: q.title,
        is_required: q.is_required,
        order: q.order,
      }));

    const responses = await this.prisma.response.findMany({
      where: { survey_publish_id: publish.id },
      include: { answers: true },
      orderBy: [{ submitted_at: 'asc' }, { id: 'asc' }],
    });

    const totals = { response_count: responses.length };

    const aggregates: Aggregate[] = [];

    const answersByQuestionId: Map<string, unknown[]> = new Map();
    for (const q of questions) answersByQuestionId.set(q.id, []);

    for (const r of responses) {
      for (const a of r.answers) {
        if (!answersByQuestionId.has(a.question_id)) continue;
        answersByQuestionId.get(a.question_id)!.push(a.value);
      }
    }

    for (const q of [...questions].sort((a, b) => a.order - b.order)) {
      const values = answersByQuestionId.get(q.id) ?? [];

      if (q.type === 'SingleChoice') {
        const counts: Record<string, number> = {};
        for (const v of values) {
          if (typeof v !== 'string') continue;
          counts[v] = (counts[v] ?? 0) + 1;
        }
        aggregates.push({ question_id: q.id, type: q.type, data: { counts } });
        continue;
      }

      if (q.type === 'MultipleChoice') {
        const counts: Record<string, number> = {};
        for (const v of values) {
          if (!Array.isArray(v)) continue;
          for (const item of v) {
            if (typeof item !== 'string') continue;
            counts[item] = (counts[item] ?? 0) + 1;
          }
        }
        aggregates.push({ question_id: q.id, type: q.type, data: { counts } });
        continue;
      }

      if (q.type === 'Text') {
        const non_blank = values.filter((v) => typeof v === 'string' && v.trim().length > 0).length;
        aggregates.push({ question_id: q.id, type: q.type, data: { non_blank } });
        continue;
      }

      if (q.type === 'Number' || q.type === 'Rating') {
        const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v)) as number[];
        const sum = nums.reduce((acc, n) => acc + n, 0);
        const avg = nums.length > 0 ? sum / nums.length : null;
        const min = nums.length > 0 ? Math.min(...nums) : null;
        const max = nums.length > 0 ? Math.max(...nums) : null;
        aggregates.push({ question_id: q.id, type: q.type, data: { count: nums.length, min, max, avg } });
        continue;
      }

      if (q.type === 'Matrix') {
        const row_counts: Record<string, number> = {};
        for (const v of values) {
          if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
          for (const [k] of Object.entries(v as Record<string, unknown>)) {
            row_counts[k] = (row_counts[k] ?? 0) + 1;
          }
        }
        aggregates.push({ question_id: q.id, type: q.type, data: { row_counts } });
        continue;
      }

      aggregates.push({ question_id: q.id, type: q.type, data: { unsupported: true } });
    }

    incCounter('results_served');
    return {
      survey: {
        id: survey.id,
        owner_user_id: survey.owner_user_id,
        slug: survey.slug,
        title: survey.title,
        description: survey.description ?? null,
        is_anonymous: survey.is_anonymous,
        status: survey.status,
        publish_hash: survey.publish_hash,
        created_at: toIso(survey.created_at),
      },
      publish_hash: publish.publish_hash,
      totals,
      aggregates,
    };
  }
}
