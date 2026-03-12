import { describe, expect, it } from 'vitest';

import { WorkflowStatusService } from '../../src/modules/workflows/workflow-status.service';

describe('workflow transition rules', () => {
  const workflowStatusService = new WorkflowStatusService();

  it('normalizes workflow definitions and preserves transition graph semantics', () => {
    const definition = workflowStatusService.validateDefinition({
      name: 'Delivery Workflow',
      statuses: [
        { key: 'to_do', name: 'To Do' },
        { key: 'in_progress', name: 'In Progress' },
        { key: 'qa_review', name: 'QA Review' },
      ],
      transitions: [
        { from: 'to_do', to: 'in_progress' },
        { from: 'in_progress', to: 'qa_review' },
      ],
    });

    expect(definition.statuses.map((status) => status.key)).toEqual(['to_do', 'in_progress', 'qa_review']);
    expect(workflowStatusService.canTransition('in_progress', 'qa_review', definition.transitions)).toBe(true);
    expect(workflowStatusService.canTransition('qa_review', 'to_do', definition.transitions)).toBe(false);
  });

  it('rejects duplicate status keys', () => {
    expect(() =>
      workflowStatusService.validateDefinition({
        name: 'Broken Workflow',
        statuses: [
          { key: 'todo', name: 'To Do' },
          { key: 'todo', name: 'Duplicate To Do' },
        ],
        transitions: [],
      }),
    ).toThrow(/Duplicate workflow status key/i);
  });
});
