import { AppError } from '@/lib/errors/AppError';
import { fail } from '@/lib/http/apiResponse';
import { logger } from '@/lib/observability/logger';

export function withErrorHandling<TContext = any>(
  handler: (req: Request, ctx: TContext) => Promise<Response> | Response,
) {
  return async (req: Request, ctx: TContext) => {
    try {
      // Next.js 15 can provide `ctx.params` as a Promise in route handlers.
      // Normalize it here so downstream `parseParams()` consistently receives an object.
      const maybeCtx: any = ctx as any;
      if (maybeCtx && typeof maybeCtx === 'object' && 'params' in maybeCtx) {
        const params = maybeCtx.params;
        if (params && typeof params === 'object' && typeof (params as any).then === 'function') {
          const resolvedParams = await params;
          const normalizedCtx = { ...maybeCtx, params: resolvedParams } as TContext;
          return await handler(req, normalizedCtx);
        }
      }

      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        return fail({ code: err.code, message: err.message, details: err.details }, err.status);
      }

      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Unhandled error', { message });
      return fail({ code: 'INTERNAL_SERVER_ERROR', message: '伺服器錯誤' }, 500);
    }
  };
}
