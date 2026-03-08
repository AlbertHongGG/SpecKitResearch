import { ServiceUnavailableException } from '@nestjs/common';

export function failClosedRateLimitUnavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException('rate_limit_unavailable');
}
