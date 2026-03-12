import { describe, expect, it } from 'vitest';

import { WorkflowsService } from '../../../apps/backend/src/modules/workflows/workflows.service';

describe('workflow transitions', () => {
  it('allows transition when edge exists', async () => {
    const prisma: any = {
      workflowTransition: {
        findUnique: async () => ({ id: 't1' }),
      },
    };

    const svc = new WorkflowsService(prisma);
    await expect(
      svc.isTransitionAllowed({ workflowId: 'wf1', fromStatusId: 's1', toStatusId: 's2' }),
    ).resolves.toBe(true);
  });

  it('denies transition when edge missing', async () => {
    const prisma: any = {
      workflowTransition: {
        findUnique: async () => null,
      },
    };

    const svc = new WorkflowsService(prisma);
    await expect(
      svc.isTransitionAllowed({ workflowId: 'wf1', fromStatusId: 's1', toStatusId: 's2' }),
    ).resolves.toBe(false);
  });
});
