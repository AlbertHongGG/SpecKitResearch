import { describe, expect, it } from 'vitest';

import { IssueKeyService } from '../../../apps/backend/src/modules/issues/issue-key.service';

describe('Issue key counter', () => {
  it('allocates key using counter inside a transaction', async () => {
    let txCalled = 0;

    const prisma: any = {
      project: {
        findUnique: async () => ({ id: 'p1', key: 'PROJ' }),
      },
      projectIssueCounter: {
        update: async () => ({ projectId: 'p1', nextNumber: 1 }),
      },
      $transaction: async (fn: any) => {
        txCalled += 1;
        return await fn({ project: prisma.project, projectIssueCounter: prisma.projectIssueCounter });
      },
    };

    const svc = new IssueKeyService(prisma);
    const issueKey = await svc.allocateIssueKey('p1');

    expect(txCalled).toBe(1);
    expect(issueKey).toBe('PROJ-1');
  });
});
