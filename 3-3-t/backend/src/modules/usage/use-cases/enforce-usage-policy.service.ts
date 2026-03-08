import { Injectable } from '@nestjs/common';

@Injectable()
export class EnforceUsagePolicyService {
  evaluate(value: number, limit: number, strategy: 'Block' | 'Throttle' | 'Overage') {
    if (value <= limit) return { allowed: true };

    if (strategy === 'Overage') {
      return { allowed: true, overage: value - limit, reasonCode: 'USAGE_OVERAGE_ALLOWED' };
    }

    if (strategy === 'Throttle') {
      return { allowed: false, reasonCode: 'USAGE_LIMIT_EXCEEDED_THROTTLE' };
    }

    return { allowed: false, reasonCode: 'USAGE_LIMIT_EXCEEDED_BLOCK' };
  }
}
