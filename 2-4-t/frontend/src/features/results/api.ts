'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { QuestionTypeSchema } from '@app/contracts';
import { apiFetchJson } from '@/lib/api/client';

export const QuestionAggregateSchema = z.object({
  question_id: z.string(),
  type: QuestionTypeSchema,
  summary: z.any()
});

export const ResultsResponseSchema = z.object({
  publish_hash: z.string(),
  response_count: z.number().int().nonnegative(),
  aggregates: z.array(QuestionAggregateSchema)
});
export type ResultsResponse = z.infer<typeof ResultsResponseSchema>;

export async function getResults(surveyId: string): Promise<ResultsResponse> {
  const data = await apiFetchJson<unknown>(`/surveys/${encodeURIComponent(surveyId)}/results`);
  return ResultsResponseSchema.parse(data);
}

export function useResults(surveyId: string) {
  return useQuery<ResultsResponse>({
    queryKey: ['results', surveyId],
    queryFn: () => getResults(surveyId),
    enabled: !!surveyId
  });
}

const ExportResponseSchema = z.object({
  export: z.object({
    format: z.enum(['json', 'csv']),
    rows: z.union([z.array(z.any()), z.string()])
  })
});
export type ExportResponse = z.infer<typeof ExportResponseSchema>;

export async function exportResponses(surveyId: string, format: 'json' | 'csv'): Promise<ExportResponse> {
  const data = await apiFetchJson<unknown>(
    `/surveys/${encodeURIComponent(surveyId)}/export?format=${encodeURIComponent(format)}`
  );
  return ExportResponseSchema.parse(data);
}
