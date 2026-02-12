'use client';

import { SubmitResponseResponseSchema } from '@acme/contracts';

import { apiFetch } from '../../lib/apiClient';

export async function submitResponse(payload: {
  survey_id: string;
  publish_hash: string;
  answers: Array<{ question_id: string; value: unknown }>;
}) {
  const data = await apiFetch<unknown>('/responses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return SubmitResponseResponseSchema.parse(data);
}
