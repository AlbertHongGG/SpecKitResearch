import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';

import { IssueTransitionController } from '../../../apps/backend/src/modules/issues/issue-transition.controller';

describe('deprecated workflow status', () => {
  it('blocks transitions when issue status is from inactive workflow', async () => {
    const issue = {
      id: 'i1',
      projectId: 'p1',
      issueKey: 'PROJ-1',
      statusId: 's_old',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      status: { key: 'todo', workflowId: 'wf_old' },
      project: { organizationId: 'org1' },
    };

    const prisma: any = {
      issue: {
        findUnique: async () => issue,
      },
    };

    const workflows: any = {
      getActiveWorkflow: async () => ({
        id: 'wf_new',
        statuses: [{ id: 's_new', key: 'done', name: 'Done', position: 1 }],
      }),
      isTransitionAllowed: async () => true,
    };

    const audit: any = { append: async () => undefined };

    const controller = new IssueTransitionController(prisma, workflows, audit);

    await expect(
      controller.transitionIssue('p1', 'PROJ-1', { toStatusKey: 'done', expectedVersion: issue.updatedAt.toISOString() }, {
        id: 'u1',
        email: 'a@example.com',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);

    try {
      await controller.transitionIssue(
        'p1',
        'PROJ-1',
        { toStatusKey: 'done', expectedVersion: issue.updatedAt.toISOString() },
        { id: 'u1', email: 'a@example.com' } as any,
      );
    } catch (e: any) {
      expect(e.getResponse?.().code).toBe('ISSUE_STATUS_DEPRECATED');
    }
  });
});
