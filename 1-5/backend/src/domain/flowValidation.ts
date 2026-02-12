import type {
  ApprovalFlowStep,
  ApprovalFlowStepAssignee,
  ApprovalFlowTemplate,
  User,
} from '@prisma/client';
import { validationFailed } from '../lib/httpError.js';

export type FlowTemplateWithSteps = ApprovalFlowTemplate & {
  steps: (ApprovalFlowStep & {
    assignees: (ApprovalFlowStepAssignee & { reviewer?: User })[];
  })[];
};

export function assertFlowTemplateActive(template: Pick<ApprovalFlowTemplate, 'id' | 'isActive'>) {
  if (!template.isActive) {
    throw validationFailed('Flow template is not active', { flowTemplateId: template.id });
  }
}

export function assertFlowHasSteps(template: Pick<ApprovalFlowTemplate, 'id'> & { steps: Array<unknown> }) {
  if (!template.steps || template.steps.length === 0) {
    throw validationFailed('Flow template has no steps', { flowTemplateId: template.id });
  }
}

export function assertEachStepHasAssignees(template: FlowTemplateWithSteps) {
  const bad = template.steps.find((s) => !s.assignees || s.assignees.length === 0);
  if (bad) {
    throw validationFailed('Each flow step must have at least one assignee', {
      flowTemplateId: template.id,
      stepKey: bad.stepKey,
    });
  }
}

export function validateTemplateForSubmission(template: FlowTemplateWithSteps) {
  assertFlowTemplateActive(template);
  assertFlowHasSteps(template);
  assertEachStepHasAssignees(template);
}
