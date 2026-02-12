import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/http/routeError';
import { requireUserId } from '@/lib/server/auth/requireUser';
import { assertRateLimit } from '@/lib/server/security/rateLimit';
import { ApiError } from '@/lib/shared/apiError';
import { monthQuerySchema } from '@/lib/shared/schemas/report';
import * as reportService from '@/lib/server/services/reportService';
import { prisma } from '@/lib/server/db';
import { toCsv } from '@/lib/server/export/csv';
import { logEvent } from '@/lib/server/observability/logger';

type ExportItem = {
  categoryId: string;
  dateKey: string;
  type: 'income' | 'expense';
  amount: number;
  note: string | null;
};

type CategoryNameRow = { id: string; name: string };

export async function GET(req: NextRequest) {
  return handleRoute(req, async (requestId) => {
    assertRateLimit(req, { key: 'reports:monthly:export', limit: 30, windowMs: 60_000 });
    const userId = await requireUserId(req);

    const { searchParams } = new URL(req.url);
    const parsed = monthQuerySchema.safeParse({
      year: searchParams.get('year'),
      month: searchParams.get('month'),
    });

    if (!parsed.success) {
      throw new ApiError({ status: 422, code: 'VALIDATION', message: '年月不合法' });
    }

    const { items } = (await reportService.exportMonthlyCsv(userId, parsed.data.year, parsed.data.month)) as {
      items: ExportItem[];
    };

    const categoryIds = Array.from(new Set(items.map((t) => t.categoryId)));
    const categories = (await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    })) as CategoryNameRow[];
    const nameMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));

    const rows = items.map((t) => ({
      date: t.dateKey,
      type: t.type,
      category: nameMap.get(t.categoryId) ?? 'Unknown',
      amount: t.amount,
      note: t.note ?? '',
    }));

    const csv = toCsv(rows, ['date', 'type', 'category', 'amount', 'note']);
    const mm = String(parsed.data.month).padStart(2, '0');
    const filename = `transactions_${parsed.data.year}_${mm}.csv`;

    const res = new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'no-store',
      },
    });

    logEvent({ requestId, userId, action: 'reports.monthly.export', meta: { year: parsed.data.year, month: parsed.data.month } });

    return res;
  });
}
