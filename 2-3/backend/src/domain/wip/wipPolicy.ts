import type { Prisma, MembershipRole } from '@prisma/client';

export class WipLimitError extends Error {
    readonly listId: string;
    readonly limit: number;
    readonly count: number;
    constructor(params: { listId: string; limit: number; count: number; message?: string }) {
        super(params.message ?? 'WIP limit exceeded');
        this.name = 'WipLimitError';
        this.listId = params.listId;
        this.limit = params.limit;
        this.count = params.count;
    }
}

export async function assertWipAllowsAdd(params: {
    tx: Prisma.TransactionClient;
    listId: string;
    actorRole: MembershipRole;
    wipOverrideReason?: string | null;
    requireOverrideReason?: boolean;
}) {
    const list = await params.tx.list.findUnique({
        where: { id: params.listId },
        select: { isWipLimited: true, wipLimit: true },
    });
    if (!list || !list.isWipLimited) return;

    const limit = list.wipLimit ?? 0;
    if (limit <= 0) return;

    const count = await params.tx.task.count({
        where: { listId: params.listId, status: { not: 'archived' } },
    });

    if (count < limit) return;

    const canOverride = params.actorRole === 'owner' || params.actorRole === 'admin';
    const reasonOk = (params.wipOverrideReason ?? '').trim().length > 0;

    if (canOverride && (!params.requireOverrideReason || reasonOk)) return;

    throw new WipLimitError({
        listId: params.listId,
        limit,
        count,
        message: `WIP limit exceeded (limit=${limit}, count=${count})`,
    });
}
