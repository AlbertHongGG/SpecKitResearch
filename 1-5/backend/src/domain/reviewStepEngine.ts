import type { StepMode } from '@prisma/client';
import { validationFailed } from '../lib/httpError.js';

export type StepDefinition = {
  stepKey: string;
  orderIndex: number;
  mode: StepMode;
  reviewerIds: string[];
};

export function normalizeSteps(steps: StepDefinition[]): StepDefinition[] {
  const sorted = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);
  if (sorted.length === 0) throw validationFailed('Flow has no steps');
  return sorted;
}

export function sortReviewerIdsForSerial(ids: string[]): string[] {
  return [...ids].sort();
}

export function initialAssigneesForStep(step: StepDefinition): string[] {
  if (!step.reviewerIds || step.reviewerIds.length === 0) {
    throw validationFailed('Flow step has no assignees', { stepKey: step.stepKey });
  }

  if (step.mode === 'Parallel') {
    return [...new Set(step.reviewerIds)];
  }

  const ordered = sortReviewerIdsForSerial(step.reviewerIds);
  const first = ordered[0];
  if (!first) {
    throw validationFailed('Flow step has no assignees', { stepKey: step.stepKey });
  }
  return [first];
}

export function nextAssigneeForSerial(options: {
  reviewerIds: string[];
  approvedAssigneeIds: string[];
}): string | null {
  const ordered = sortReviewerIdsForSerial(options.reviewerIds);
  const approved = new Set(options.approvedAssigneeIds);
  for (const id of ordered) {
    if (!approved.has(id)) return id;
  }
  return null;
}

export function isStepComplete(options: {
  mode: StepMode;
  reviewerIds: string[];
  approvedAssigneeIds: string[];
}): boolean {
  const required = new Set(options.reviewerIds);
  const approved = new Set(options.approvedAssigneeIds);
  for (const id of required) {
    if (!approved.has(id)) return false;
  }
  return true;
}

export function getNextStepKey(orderedSteps: StepDefinition[], currentStepKey: string): string | null {
  const idx = orderedSteps.findIndex((s) => s.stepKey === currentStepKey);
  if (idx < 0) throw validationFailed('Unknown step key', { stepKey: currentStepKey });
  const next = orderedSteps[idx + 1];
  return next ? next.stepKey : null;
}
