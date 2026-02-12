'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  CreateSurveyRequestSchema,
  SurveyDetailSchema,
  SurveySummarySchema,
  UpdateSurveyRequestSchema,
  SurveyStatusSchema
} from '@app/contracts';
import { apiFetchJson } from '@/lib/api/client';

const ListSurveysResponseSchema = z.object({
  surveys: z.array(SurveySummarySchema)
});
export type ListSurveysResponse = z.infer<typeof ListSurveysResponseSchema>;

const SurveySummaryEnvelopeSchema = z.object({
  survey: SurveySummarySchema
});
export type SurveySummaryEnvelope = z.infer<typeof SurveySummaryEnvelopeSchema>;

const SurveyDetailEnvelopeSchema = z.object({
  survey: SurveyDetailSchema
});
export type SurveyDetailEnvelope = z.infer<typeof SurveyDetailEnvelopeSchema>;

export async function listSurveys(): Promise<ListSurveysResponse> {
  const data = await apiFetchJson<unknown>('/surveys');
  return ListSurveysResponseSchema.parse(data);
}

export async function createSurvey(input: unknown, csrfToken?: string): Promise<SurveySummaryEnvelope> {
  const req = CreateSurveyRequestSchema.parse(input);
  const data = await apiFetchJson<unknown>(
    '/surveys',
    { method: 'POST', body: JSON.stringify(req) },
    { csrfToken }
  );
  return SurveySummaryEnvelopeSchema.parse(data);
}

export async function getSurvey(id: string): Promise<SurveyDetailEnvelope> {
  const data = await apiFetchJson<unknown>(`/surveys/${encodeURIComponent(id)}`);
  return SurveyDetailEnvelopeSchema.parse(data);
}

export async function updateSurvey(id: string, input: unknown, csrfToken?: string): Promise<SurveyDetailEnvelope> {
  const req = UpdateSurveyRequestSchema.parse(input);
  const data = await apiFetchJson<unknown>(
    `/surveys/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(req) },
    { csrfToken }
  );
  return SurveyDetailEnvelopeSchema.parse(data);
}

export function useSurveysList() {
  return useQuery<ListSurveysResponse>({
    queryKey: ['surveys'],
    queryFn: listSurveys
  });
}

export function useSurvey(id: string) {
  return useQuery<SurveyDetailEnvelope>({
    queryKey: ['surveys', id],
    queryFn: () => getSurvey(id),
    enabled: !!id
  });
}

export function useCreateSurvey(csrfToken?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => createSurvey(input, csrfToken),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['surveys'] });
    }
  });
}

export function useUpdateSurvey(id: string, csrfToken?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => updateSurvey(id, input, csrfToken),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['surveys'] });
      await qc.invalidateQueries({ queryKey: ['surveys', id] });
    }
  });
}

const PublishSurveyResponseSchema = z.object({
  survey: z.object({
    id: z.string(),
    status: SurveyStatusSchema,
    publish_hash: z.string()
  })
});
export type PublishSurveyResponse = z.infer<typeof PublishSurveyResponseSchema>;

export async function publishSurvey(id: string, csrfToken?: string): Promise<PublishSurveyResponse> {
  const data = await apiFetchJson<unknown>(
    `/surveys/${encodeURIComponent(id)}/publish`,
    { method: 'POST' },
    { csrfToken }
  );
  return PublishSurveyResponseSchema.parse(data);
}

const CloseSurveyResponseSchema = z.object({
  survey: z.object({
    id: z.string(),
    status: SurveyStatusSchema
  })
});
export type CloseSurveyResponse = z.infer<typeof CloseSurveyResponseSchema>;

export async function closeSurvey(id: string, csrfToken?: string): Promise<CloseSurveyResponse> {
  const data = await apiFetchJson<unknown>(
    `/surveys/${encodeURIComponent(id)}/close`,
    { method: 'POST' },
    { csrfToken }
  );
  return CloseSurveyResponseSchema.parse(data);
}

export function usePublishSurvey(id: string, csrfToken?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => publishSurvey(id, csrfToken),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['surveys'] });
      await qc.invalidateQueries({ queryKey: ['surveys', id] });
    }
  });
}

export function useCloseSurvey(id: string, csrfToken?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => closeSurvey(id, csrfToken),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['surveys'] });
      await qc.invalidateQueries({ queryKey: ['surveys', id] });
    }
  });
}

