import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/http/routeError';
import { requireUserId } from '@/lib/server/auth/requireUser';
import { ApiError } from '@/lib/shared/apiError';
import { monthQuerySchema } from '@/lib/shared/schemas/report';
import * as reportService from '@/lib/server/services/reportService';

export async function GET(req: NextRequest) {
  return handleRoute(req, async () => {
    const userId = await requireUserId(req);

    const { searchParams } = new URL(req.url);
    const parsed = monthQuerySchema.safeParse({
      year: searchParams.get('year'),
      month: searchParams.get('month'),
    });

    if (!parsed.success) {
      throw new ApiError({ status: 422, code: 'VALIDATION', message: '年月不合法' });
    }

    const report = await reportService.getMonthlyReport(userId, parsed.data.year, parsed.data.month);

    const res = NextResponse.json(report, { status: 200 });
    res.headers.set('cache-control', 'no-store');
    return res;
  });
}
