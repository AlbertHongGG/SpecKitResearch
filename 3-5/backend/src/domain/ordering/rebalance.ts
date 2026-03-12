import type { Prisma } from '@prisma/client';
import { generateNKeysBetween } from 'fractional-indexing';

export async function rebalanceListPositions(params: {
    tx: Prisma.TransactionClient;
    listId: string;
}): Promise<{ listId: string; updatedCount: number }> {
    const tasks = await params.tx.task.findMany({
        where: { listId: params.listId },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true },
    });

    const keys = generateNKeysBetween(null, null, tasks.length);

    await Promise.all(
        tasks.map((t, idx) =>
            params.tx.task.update({
                where: { id: t.id },
                data: { position: keys[idx] },
            }),
        ),
    );

    return { listId: params.listId, updatedCount: tasks.length };
}
