import { Injectable, NotFoundException } from '@nestjs/common';

import { incCounter } from '../common/metrics';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

type CursorPayload = {
  cutoff_iso: string;
  last_submitted_at_iso?: string;
  last_id?: string;
};

function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as CursorPayload;
    if (!parsed || typeof parsed.cutoff_iso !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function toIso(date: Date): string {
  return date.toISOString();
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportResponses(params: { surveyId: string; cursor?: string; limit?: number }) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: params.surveyId },
      select: { id: true, status: true, publish_hash: true },
    });

    if (!survey) throw new NotFoundException('Survey not found');
    if ((survey.status !== 'Published' && survey.status !== 'Closed') || !survey.publish_hash) {
      throw new NotFoundException('Survey not found');
    }

    const publish = await this.prisma.surveyPublish.findUnique({
      where: { publish_hash: survey.publish_hash },
      select: { id: true, publish_hash: true },
    });

    if (!publish) throw new NotFoundException('Survey not found');

    const limit = Math.max(1, Math.min(1000, params.limit ?? 200));

    const decoded = params.cursor ? decodeCursor(params.cursor) : null;
    const cutoff = decoded?.cutoff_iso ? new Date(decoded.cutoff_iso) : new Date();

    const lastSubmittedAt = decoded?.last_submitted_at_iso ? new Date(decoded.last_submitted_at_iso) : null;
    const lastId = decoded?.last_id ?? null;

    const where: Prisma.ResponseWhereInput = {
      survey_publish_id: publish.id,
      submitted_at: { lte: cutoff },
    };

    if (lastSubmittedAt && lastId) {
      where.AND = [
        {
          OR: [
            { submitted_at: { gt: lastSubmittedAt } },
            { submitted_at: { equals: lastSubmittedAt }, id: { gt: lastId } },
          ],
        },
      ];
    }

    const rows = await this.prisma.response.findMany({
      where,
      orderBy: [{ submitted_at: 'asc' }, { id: 'asc' }],
      take: limit,
      include: { answers: true },
    });

    const responses = rows.map((r) => ({
      response_id: r.id,
      response_hash: r.response_hash,
      submitted_at: toIso(r.submitted_at),
      respondent_id: r.respondent_id ?? null,
      answers: r.answers
        .map((a) => ({ question_id: a.question_id, value: a.value }))
        .sort((a, b) => a.question_id.localeCompare(b.question_id)),
    }));

    const next_cursor =
      rows.length === limit
        ? encodeCursor({
            cutoff_iso: toIso(cutoff),
            last_submitted_at_iso: toIso(rows[rows.length - 1]!.submitted_at),
            last_id: rows[rows.length - 1]!.id,
          })
        : null;

    incCounter('export_page_served');

    return {
      publish_hash: publish.publish_hash,
      next_cursor,
      responses,
    };
  }
}
