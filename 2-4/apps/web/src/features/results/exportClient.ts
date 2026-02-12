'use client';

import type { z } from 'zod';
import { ExportResponseSchema } from '@acme/contracts';

import { exportResponses } from '../adminDraft/api';

export type ExportRow = z.infer<typeof ExportResponseSchema>['responses'][number];

export async function exportAllPages(params: { surveyId: string; limit?: number; maxPages?: number }) {
  const limit = params.limit ?? 200;
  const maxPages = params.maxPages ?? 10;

  let cursor: string | null | undefined = undefined;
  const responses: ExportRow[] = [];
  let publish_hash: string | null = null;

  for (let i = 0; i < maxPages; i++) {
    const page = await exportResponses({ surveyId: params.surveyId, cursor, limit });
    publish_hash = page.publish_hash;
    responses.push(...page.responses);
    cursor = page.next_cursor ?? null;
    if (!cursor) break;
  }

  return { publish_hash, responses, next_cursor: cursor };
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
