import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/http/routeError';
import { requireUserId } from '@/lib/server/auth/requireUser';
import { assertSameOrigin } from '@/lib/server/security/sameOrigin';
import { assertRateLimit } from '@/lib/server/security/rateLimit';
import { ApiError } from '@/lib/shared/apiError';
import { updateTransactionSchema } from '@/lib/shared/schemas/transaction';
import * as transactionService from '@/lib/server/services/transactionService';
import { logEvent } from '@/lib/server/observability/logger';

export async function PATCH(req: NextRequest, ctx: { params: { transactionId: string } }) {
  return handleRoute(req, async (requestId) => {
    assertSameOrigin(req);
    assertRateLimit(req, { key: 'transactions:update', limit: 120, windowMs: 60_000 });
    const userId = await requireUserId(req);

    const body = updateTransactionSchema.safeParse(await req.json());
    if (!body.success) {
      throw new ApiError({ status: 422, code: 'VALIDATION', message: '輸入驗證失敗' });
    }

    const updated = await transactionService.updateTransaction(userId, ctx.params.transactionId, body.data);

    logEvent({ requestId, userId, action: 'transactions.update', meta: { transactionId: updated.id } });

    return NextResponse.json(
      {
        transaction: {
          id: updated.id,
          type: updated.type,
          amount: updated.amount,
          categoryId: updated.categoryId,
          date: updated.dateKey,
          note: updated.note ?? undefined,
        },
      },
      { status: 200 },
    );
  });
}

export async function DELETE(req: NextRequest, ctx: { params: { transactionId: string } }) {
  return handleRoute(req, async (requestId) => {
    assertSameOrigin(req);
    assertRateLimit(req, { key: 'transactions:delete', limit: 120, windowMs: 60_000 });
    const userId = await requireUserId(req);
    const result = await transactionService.deleteTransaction(userId, ctx.params.transactionId);

     logEvent({ requestId, userId, action: 'transactions.delete', meta: { transactionId: ctx.params.transactionId } });
    return NextResponse.json(result, { status: 200 });
  });
}
