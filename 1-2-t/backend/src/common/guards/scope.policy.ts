import type { ExecutionContext } from '@nestjs/common';

export interface ScopePolicy {
  canAccess(context: ExecutionContext): Promise<boolean> | boolean;
}
