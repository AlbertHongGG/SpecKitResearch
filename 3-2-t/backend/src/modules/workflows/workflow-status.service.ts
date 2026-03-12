import { ConflictException, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import type { WorkflowDefinitionInput, WorkflowTransitionInput } from './workflows.repository';

export interface NormalizedWorkflowDefinition {
  name: string;
  statuses: Array<{ key: string; name: string; position: number }>;
  transitions: WorkflowTransitionInput[];
}

@Injectable()
export class WorkflowStatusService {
  validateDefinition(input: WorkflowDefinitionInput): NormalizedWorkflowDefinition {
    const name = input.name?.trim();
    if (!name) {
      throw this.invalid('Workflow name is required.');
    }

    const statuses = (input.statuses ?? []).map((status, index) => {
      const statusName = status.name?.trim();
      if (!statusName) {
        throw this.invalid('Each workflow status must have a name.');
      }

      return {
        key: this.normalizeKey(status.key ?? statusName),
        name: statusName,
        position: index + 1,
      };
    });

    if (statuses.length === 0) {
      throw this.invalid('Workflow must define at least one status.');
    }

    const duplicateStatus = statuses.find(
      (status, index) => statuses.findIndex((candidate) => candidate.key === status.key) !== index,
    );
    if (duplicateStatus) {
      throw this.invalid(`Duplicate workflow status key: ${duplicateStatus.key}.`);
    }

    const transitions = (input.transitions ?? []).map((transition) => ({
      from: this.normalizeKey(transition.from),
      to: this.normalizeKey(transition.to),
    }));

    const statusKeys = new Set(statuses.map((status) => status.key));
    for (const transition of transitions) {
      if (!statusKeys.has(transition.from) || !statusKeys.has(transition.to)) {
        throw this.invalid('Workflow transitions must reference statuses in the same workflow.');
      }
    }

    const duplicateTransition = transitions.find(
      (transition, index) =>
        transitions.findIndex(
          (candidate) => candidate.from === transition.from && candidate.to === transition.to,
        ) !== index,
    );
    if (duplicateTransition) {
      throw this.invalid(`Duplicate workflow transition: ${duplicateTransition.from} -> ${duplicateTransition.to}.`);
    }

    return {
      name,
      statuses,
      transitions,
    };
  }

  canTransition(currentStatusKey: string, targetStatusKey: string, transitions: WorkflowTransitionInput[]): boolean {
    return transitions.some(
      (transition) => transition.from === currentStatusKey && transition.to === targetStatusKey,
    );
  }

  private normalizeKey(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  private invalid(message: string): ConflictException {
    return new ConflictException({
      code: ERROR_CODES.WORKFLOW_INVALID,
      message,
    });
  }
}
