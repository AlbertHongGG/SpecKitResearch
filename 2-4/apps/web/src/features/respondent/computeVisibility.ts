'use client';

import type { SurveySnapshot, AnswersByQuestionId } from '@acme/logic-engine';
import { computeVisibleQuestions } from '@acme/logic-engine';
import type { z } from 'zod';
import { PublicSurveyResponseSchema } from '@acme/contracts';

type PublicSurveyResponse = z.infer<typeof PublicSurveyResponseSchema>;

const snapshotCache = new WeakMap<object, SurveySnapshot>();

export function toSurveySnapshot(publicSurvey: PublicSurveyResponse): SurveySnapshot {
  const cached = snapshotCache.get(publicSurvey as unknown as object);
  if (cached) return cached;

  const snapshot: SurveySnapshot = {
    survey: {
      id: publicSurvey.survey.id,
      slug: publicSurvey.survey.slug,
      title: publicSurvey.survey.title,
      description: publicSurvey.survey.description ?? null,
      is_anonymous: publicSurvey.survey.is_anonymous,
      status: publicSurvey.survey.status,
    },
    publish_hash: publicSurvey.publish_hash,
    questions: publicSurvey.questions.map((q) => ({
      id: q.id,
      type: q.type,
      title: q.title,
      is_required: q.is_required,
      order: q.order,
    })),
    rule_groups: publicSurvey.rule_groups.map((g) => ({
      id: g.id,
      target_question_id: g.target_question_id,
      action: g.action,
      group_operator: g.group_operator,
      rules: g.rules.map((r) => ({
        id: r.id,
        source_question_id: r.source_question_id,
        operator: r.operator,
        value: r.value,
      })),
    })),
  };

  snapshotCache.set(publicSurvey as unknown as object, snapshot);
  return snapshot;
}

export function computeVisibilityForPublicSurvey(publicSurvey: PublicSurveyResponse, answers: AnswersByQuestionId) {
  const snapshot = toSurveySnapshot(publicSurvey);
  return computeVisibleQuestions(snapshot, answers);
}
