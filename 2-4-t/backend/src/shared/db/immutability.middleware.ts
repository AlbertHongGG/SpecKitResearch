import type { PrismaClient } from '@prisma/client';

const IMMUTABLE_MODELS = new Set(['Response', 'Answer']);
const IMMUTABLE_ACTIONS = new Set(['update', 'updateMany', 'delete', 'deleteMany']);

type MiddlewareParams = {
  model?: string;
  action: string;
};

type MiddlewareNext = (params: unknown) => Promise<unknown>;

export function installImmutabilityMiddleware(prisma: PrismaClient) {
  const use = (prisma as any).$use as undefined | ((cb: any) => void);
  if (typeof use !== 'function') return;

  use(async (params: MiddlewareParams, next: MiddlewareNext) => {
    if (IMMUTABLE_MODELS.has(params.model ?? '') && IMMUTABLE_ACTIONS.has(params.action)) {
      throw new Error(`IMMUTABLE_VIOLATION:${params.model}:${params.action}`);
    }
    return next(params);
  });
}
