'use client';

import {
  CloseSurveyResponseSchema,
  CreateSurveyRequestSchema,
  CreateSurveyResponseSchema,
  ExportResponseSchema,
  PublishSurveyResponseSchema,
  PreviewSurveyRequestSchema,
  PreviewSurveyResponseSchema,
  ResultsResponseSchema,
  SurveyDetailResponseSchema,
  SurveyListResponseSchema,
} from '@acme/contracts';

import { apiFetch } from '../../lib/apiClient';

export async function listSurveys() {
  const data = await apiFetch<unknown>('/surveys');
  return SurveyListResponseSchema.parse(data);
}

export async function createSurvey(req: unknown) {
  const parsed = CreateSurveyRequestSchema.parse(req);
  const data = await apiFetch<unknown>('/surveys', {
    method: 'POST',
    body: JSON.stringify(parsed),
  });
  return CreateSurveyResponseSchema.parse(data);
}

export async function getSurveyDetail(surveyId: string) {
  const data = await apiFetch<unknown>(`/surveys/${surveyId}`);
  return SurveyDetailResponseSchema.parse(data);
}

export async function updateSurvey(surveyId: string, patch: unknown) {
  const data = await apiFetch<unknown>(`/surveys/${surveyId}`, {
    method: 'PUT',
    body: JSON.stringify({ patch }),
  });
  return SurveyDetailResponseSchema.parse(data);
}

export async function previewSurvey(surveyId: string, req: unknown) {
  const parsed = PreviewSurveyRequestSchema.parse(req);
  const data = await apiFetch<unknown>(`/surveys/${surveyId}/preview`, {
    method: 'POST',
    body: JSON.stringify(parsed),
  });
  return PreviewSurveyResponseSchema.parse(data);
}

export async function publishSurvey(surveyId: string) {
  const data = await apiFetch<unknown>(`/surveys/${surveyId}/publish`, { method: 'POST' });
  return PublishSurveyResponseSchema.parse(data);
}

export async function closeSurvey(surveyId: string) {
  const data = await apiFetch<unknown>(`/surveys/${surveyId}/close`, { method: 'POST' });
  return CloseSurveyResponseSchema.parse(data);
}

export async function getResults(surveyId: string) {
  const data = await apiFetch<unknown>(`/surveys/${surveyId}/results`);
  return ResultsResponseSchema.parse(data);
}

export async function exportResponses(params: { surveyId: string; cursor?: string | null; limit?: number }) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const data = await apiFetch<unknown>(`/surveys/${params.surveyId}/export${suffix}`);
  return ExportResponseSchema.parse(data);
}
