import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/http/routeError';
import { requireUserId } from '@/lib/server/auth/requireUser';
import { assertSameOrigin } from '@/lib/server/security/sameOrigin';
import { assertRateLimit } from '@/lib/server/security/rateLimit';
import { ApiError } from '@/lib/shared/apiError';
import { createTransactionSchema } from '@/lib/shared/schemas/transaction';
import * as transactionService from '@/lib/server/services/transactionService';
import { logEvent } from '@/lib/server/observability/logger';

function computeDailySummaries(items: Array<{ dateKey: string; type: 'income' | 'expense'; amount: number }>) {
  const map = new Map<string, { incomeTotal: number; expenseTotal: number }>();
  for (const t of items) {
    const cur = map.get(t.dateKey) ?? { incomeTotal: 0, expenseTotal: 0 };
    if (t.type === 'income') cur.incomeTotal += t.amount;
    else cur.expenseTotal += t.amount;
    map.set(t.dateKey, cur);
  }

  return Array.from(map.entries())
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .map(([date, v]) => ({ date, ...v }));
}

export async function GET(req: NextRequest) {
  return handleRoute(req, async () => {
    const userId = await requireUserId(req);

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Number(searchParams.get('pageSize') ?? '30');
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;

    if (!Number.isInteger(page) || page < 1) {
      throw new ApiError({ status: 422, code: 'VALIDATION', message: 'page 不合法' });
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new ApiError({ status: 422, code: 'VALIDATION', message: 'pageSize 不合法' });
    }

    const { total, items } = await transactionService.listTransactions({
      userId,
      page,
      pageSize,
      dateFrom,
      dateTo,
    });

    const dailySummaries = computeDailySummaries(
      items.map((t) => ({ dateKey: t.dateKey, type: t.type as any, amount: t.amount })),
    );

    return NextResponse.json(
      {
        items: items.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          categoryId: t.categoryId,
          date: t.dateKey,
          note: t.note ?? undefined,
        })),
        pageInfo: { page, pageSize, total },
        dailySummaries,
      },
      { status: 200 },
    );
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(req, async (requestId) => {
    assertSameOrigin(req);
    assertRateLimit(req, { key: 'transactions:create', limit: 60, windowMs: 60_000 });
    const userId = await requireUserId(req);

    const body = createTransactionSchema.safeParse(await req.json());
    if (!body.success) {
      throw new ApiError({ status: 422, code: 'VALIDATION', message: '輸入驗證失敗' });
    }

    const created = await transactionService.createTransaction(userId, body.data);

    logEvent({ requestId, userId, action: 'transactions.create', meta: { transactionId: created.id } });

    return NextResponse.json(
      {
        transaction: {
          id: created.id,
          type: created.type,
          amount: created.amount,
          categoryId: created.categoryId,
          date: created.dateKey,
          note: created.note ?? undefined,
        },
      },
      { status: 201 },
    );
  });
}
