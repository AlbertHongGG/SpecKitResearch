import { SetMetadata, Type } from '@nestjs/common';
import type { ScopePolicy as ScopePolicyType } from './scope.policy';

export const SCOPE_POLICY_KEY = 'scopePolicy';

export const ScopePolicy = (policy: Type<ScopePolicyType>) =>
  SetMetadata(SCOPE_POLICY_KEY, policy);
