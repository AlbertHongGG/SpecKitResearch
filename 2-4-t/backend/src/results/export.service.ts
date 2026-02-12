import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { logResponsesExported } from '../shared/logging/events';

type ExportFormat = 'json' | 'csv';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportResponsesForOwner(ownerUserId: string, surveyId: string, format: ExportFormat) {
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.ownerUserId !== ownerUserId) throw new NotFoundException('Survey not found');
    if (survey.status === 'DRAFT' || !survey.publishHash) {
      throw new ConflictException({
        message: 'Survey must be published to export responses',
        details: [{ code: 'SURVEY_NOT_PUBLISHED', message: `Current status: ${survey.status}` }]
      });
    }

    const responses = await this.prisma.response.findMany({
      where: { surveyId },
      orderBy: { submittedAt: 'asc' },
      include: { answers: true }
    });

    const jsonRows = responses.map((r) => {
      const answers: Record<string, unknown> = {};
      for (const a of r.answers) answers[a.questionId] = a.valueJson as unknown;
      return {
        response_id: r.id,
        submitted_at: r.submittedAt.toISOString(),
        respondent_id: r.respondentId ?? null,
        publish_hash: r.publishHash,
        response_hash: r.responseHash,
        answers
      };
    });

    logResponsesExported({
      survey_id: surveyId,
      owner_user_id: ownerUserId,
      format,
      count: jsonRows.length
    });

    if (format === 'json') return jsonRows;

    const header = ['response_id', 'submitted_at', 'respondent_id', 'publish_hash', 'response_hash', 'answers_json'];
    const lines = [header.join(',')];
    for (const row of jsonRows) {
      const csvRow = [
        row.response_id,
        row.submitted_at,
        row.respondent_id ?? '',
        row.publish_hash,
        row.response_hash,
        JSON.stringify(row.answers).replaceAll('"', '""')
      ].map((v) => `"${String(v)}"`);
      lines.push(csvRow.join(','));
    }
    return lines.join('\n');
  }
}
