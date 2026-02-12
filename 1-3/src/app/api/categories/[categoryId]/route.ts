import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/http/routeError';
import { requireUserId } from '@/lib/server/auth/requireUser';
import { assertSameOrigin } from '@/lib/server/security/sameOrigin';
import { assertRateLimit } from '@/lib/server/security/rateLimit';
import { ApiError } from '@/lib/shared/apiError';
import { updateCategorySchema } from '@/lib/shared/schemas/category';
import * as categoryService from '@/lib/server/services/categoryService';
import { logEvent } from '@/lib/server/observability/logger';

export async function PATCH(req: NextRequest, ctx: { params: { categoryId: string } }) {
  return handleRoute(req, async (requestId) => {
    assertSameOrigin(req);
    assertRateLimit(req, { key: 'categories:update', limit: 120, windowMs: 60_000 });
    const userId = await requireUserId(req);

    const body = updateCategorySchema.safeParse(await req.json());
    if (!body.success) {
      throw new ApiError({ status: 422, code: 'VALIDATION', message: '輸入驗證失敗' });
    }

    const category = await categoryService.updateCategory(userId, ctx.params.categoryId, body.data);

    logEvent({ requestId, userId, action: 'categories.update', meta: { categoryId: category.id } });
    return NextResponse.json({ category }, { status: 200 });
  });
}
