'use client';

import { useQuery } from '@tanstack/react-query';
import { PublicSurveyResponseSchema } from '@acme/contracts';

import { apiFetch } from '../../lib/apiClient';

export function usePublicSurvey(slug: string) {
  return useQuery({
    queryKey: ['publicSurvey', slug],
    queryFn: async () => {
      const data = await apiFetch<unknown>(`/public/surveys/${encodeURIComponent(slug)}`);
      return PublicSurveyResponseSchema.parse(data);
    },
    enabled: Boolean(slug),
  });
}
