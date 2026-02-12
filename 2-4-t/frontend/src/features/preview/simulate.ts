'use client';

import type { PublicSurvey, SurveyDetail } from '@app/contracts';

export function toPreviewSurvey(detail: SurveyDetail): PublicSurvey {
  return {
    id: detail.id,
    slug: detail.slug,
    title: detail.title,
    description: detail.description,
    is_anonymous: detail.is_anonymous,
    questions: detail.questions,
    rule_groups: detail.rule_groups
  };
}
