import type { Prisma } from '@prisma/client';
import { ValidationError } from '../../api/httpErrors.js';

export async function assertAssigneesBelongToProject(params: {
    tx: Prisma.TransactionClient;
    projectId: string;
    assigneeIds: string[];
}) {
    if (params.assigneeIds.length === 0) return;

    const memberships = await params.tx.projectMembership.findMany({
        where: { projectId: params.projectId, userId: { in: params.assigneeIds } },
        select: { userId: true },
    });

    const memberIds = new Set(memberships.map((m) => m.userId));
    const invalid = params.assigneeIds.filter((id) => !memberIds.has(id));

    if (invalid.length) {
        throw new ValidationError({ assigneeIds: ['Some assignees are not members of this project'] });
    }
}
