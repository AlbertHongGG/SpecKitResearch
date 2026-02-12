import type { Prisma } from '@prisma/client';

export async function withIdempotency<T>(params: {
    tx: Prisma.TransactionClient;
    userId: string;
    scope: string;
    key: string;
    execute: () => Promise<T>;
}): Promise<{ result: T; replayed: boolean }> {
    const existing = await params.tx.idempotencyKey.findUnique({
        where: { userId_scope_key: { userId: params.userId, scope: params.scope, key: params.key } },
        select: { response: true },
    });

    if (existing) {
        return { result: existing.response as T, replayed: true };
    }

    const result = await params.execute();

    await params.tx.idempotencyKey.create({
        data: {
            userId: params.userId,
            scope: params.scope,
            key: params.key,
            response: result as unknown as Prisma.InputJsonValue,
        },
    });

    return { result, replayed: false };
}
