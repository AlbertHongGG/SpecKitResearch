import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';

type Aggregate = {
  question_id: string;
  type: string;
  summary: unknown;
};

@Injectable()
export class AggregatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getResultsForOwner(ownerUserId: string, surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } }
    });

    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.ownerUserId !== ownerUserId) throw new NotFoundException('Survey not found');
    if (survey.status === 'DRAFT' || !survey.publishHash) {
      throw new ConflictException({
        message: 'Survey must be published to view results',
        details: [{ code: 'SURVEY_NOT_PUBLISHED', message: `Current status: ${survey.status}` }]
      });
    }

    const responseCount = await this.prisma.response.count({ where: { surveyId } });

    const answers = await this.prisma.answer.findMany({
      where: { response: { surveyId } },
      select: {
        questionId: true,
        valueJson: true
      }
    });

    const byQuestionId = new Map<string, unknown[]>();
    for (const a of answers) {
      const arr = byQuestionId.get(a.questionId) ?? [];
      arr.push(a.valueJson as unknown);
      byQuestionId.set(a.questionId, arr);
    }

    const aggregates: Aggregate[] = survey.questions.map((q) => {
      const values = byQuestionId.get(q.id) ?? [];
      const answeredCount = values.length;

      if (q.type === 'SC') {
        const counts: Record<string, number> = {};
        for (const v of values) {
          if (typeof v === 'string') counts[v] = (counts[v] ?? 0) + 1;
        }
        return { question_id: q.id, type: q.type, summary: { answered_count: answeredCount, counts } };
      }

      if (q.type === 'MC') {
        const counts: Record<string, number> = {};
        for (const v of values) {
          if (Array.isArray(v)) {
            for (const item of v) {
              if (typeof item === 'string') counts[item] = (counts[item] ?? 0) + 1;
            }
          }
        }
        return { question_id: q.id, type: q.type, summary: { answered_count: answeredCount, counts } };
      }

      if (q.type === 'NUMBER' || q.type === 'RATING') {
        let sum = 0;
        let min: number | null = null;
        let max: number | null = null;
        let n = 0;
        for (const v of values) {
          if (typeof v !== 'number' || !Number.isFinite(v)) continue;
          n++;
          sum += v;
          min = min === null ? v : Math.min(min, v);
          max = max === null ? v : Math.max(max, v);
        }
        const mean = n ? sum / n : null;
        return { question_id: q.id, type: q.type, summary: { answered_count: answeredCount, n, min, max, mean } };
      }

      if (q.type === 'MATRIX') {
        const cellCounts: Record<string, number> = {};
        for (const v of values) {
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            for (const [k] of Object.entries(v as Record<string, unknown>)) {
              cellCounts[k] = (cellCounts[k] ?? 0) + 1;
            }
          }
        }
        return { question_id: q.id, type: q.type, summary: { answered_count: answeredCount, cell_counts: cellCounts } };
      }

      // TEXT and fallback
      return { question_id: q.id, type: q.type, summary: { answered_count: answeredCount } };
    });

    return {
      publish_hash: survey.publishHash,
      response_count: responseCount,
      aggregates
    };
  }
}
