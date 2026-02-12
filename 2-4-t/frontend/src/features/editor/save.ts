'use client';

import type { EditorState } from './state';
import { toUpdateSurveyRequest } from './state';
import { updateSurvey } from '@/features/surveys/api';

export async function saveDraft(surveyId: string, state: EditorState, csrfToken?: string) {
  const req = toUpdateSurveyRequest(state);
  return updateSurvey(surveyId, req, csrfToken);
}
