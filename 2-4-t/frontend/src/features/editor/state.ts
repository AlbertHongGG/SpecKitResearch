'use client';

import type { Question, RuleGroup, SurveyDetail, UpdateSurveyRequest } from '@app/contracts';

export type EditorState = {
  title: string;
  description: string | null;
  is_anonymous: boolean;
  questions: Question[];
  rule_groups: RuleGroup[];
};

export function editorStateFromSurvey(survey: SurveyDetail): EditorState {
  return {
    title: survey.title,
    description: survey.description,
    is_anonymous: survey.is_anonymous,
    questions: survey.questions,
    rule_groups: survey.rule_groups
  };
}

export function toUpdateSurveyRequest(state: EditorState): UpdateSurveyRequest {
  return {
    title: state.title,
    description: state.description,
    is_anonymous: state.is_anonymous,
    questions: state.questions,
    rule_groups: state.rule_groups
  };
}

export function newId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    const c = crypto as unknown as { randomUUID?: () => string };
    if (typeof c.randomUUID === 'function') {
      return c.randomUUID();
    }
  }
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
