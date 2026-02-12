import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core/injector/module-ref';
import { SCOPE_POLICY_KEY } from './scope.decorator';
import type { ScopePolicy } from './scope.policy';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyType = this.reflector.getAllAndOverride<
      Type<ScopePolicy> | undefined
    >(SCOPE_POLICY_KEY, [context.getHandler(), context.getClass()]);
    if (!policyType) return true;

    const policy = this.moduleRef.get(policyType, { strict: false });
    if (!policy) {
      throw new Error(`Scope policy not registered: ${policyType.name}`);
    }

    const allowed = await policy.canAccess(context);
    if (!allowed) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Out of scope',
      });
    }
    return true;
  }
}
