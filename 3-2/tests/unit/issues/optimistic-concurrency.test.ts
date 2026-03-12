import { describe, expect, it } from 'vitest';
import { ConflictException } from '@nestjs/common';

import { IssueDetailController } from '../../../apps/backend/src/modules/issues/issue-detail.controller';

describe('optimistic concurrency', () => {
  it('throws 409 when expectedVersion mismatches', async () => {
    const issue = {
      id: 'i1',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      status: { key: 'todo' },
      labels: [],
      project: { organizationId: 'org1' },
      title: 't',
      description: null,
      priority: 'low',
      assigneeUserId: null,
      dueDate: null,
      estimate: null,
      reporterUserId: 'u1',
      issueKey: 'PROJ-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const prisma: any = {
      issue: {
        findUnique: async () => issue,
      },
    };

    const audit: any = { append: async () => undefined };

    const controller = new IssueDetailController(prisma, audit);

    await expect(
      controller.patchIssue(
        'p1',
        'PROJ-1',
        { expectedVersion: 'stale', patch: { title: 'new' } },
        { id: 'u1', email: 'a@example.com' } as any,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    try {
      await controller.patchIssue(
        'p1',
        'PROJ-1',
        { expectedVersion: 'stale', patch: { title: 'new' } },
        { id: 'u1', email: 'a@example.com' } as any,
      );
    } catch (e: any) {
      expect(e.getResponse?.().code).toBe('CONFLICT');
    }
  });
});
