import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { RateLimitService } from '../shared/rate-limit/rate-limit.service';
import { failClosedRateLimitUnavailable } from '../shared/rate-limit/rate-limit.fail-closed';
import type { ApiKeyPrincipal, ResolvedEndpoint } from '../shared/auth/auth.types';

type RequestWithAuthContext = FastifyRequest & {
  apiKey?: ApiKeyPrincipal;
  resolvedEndpoint?: ResolvedEndpoint;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    if (!request.apiKey) {
      throw new UnauthorizedException();
    }

    const endpointId = request.resolvedEndpoint?.endpointId;

    try {
      const limits = await this.rateLimitService.getLimitsForApiKey({
        rateLimitPerMinute: request.apiKey.rateLimitPerMinute ?? null,
        rateLimitPerHour: request.apiKey.rateLimitPerHour ?? null
      });

      const decision = await this.rateLimitService.check({
        apiKeyId: request.apiKey.apiKeyId,
        endpointId,
        perMinute: limits.perMinute,
        perHour: limits.perHour
      });

      if (!decision.allowed) {
        reply.header('Retry-After', String(decision.retryAfterSeconds));
        throw new HttpException('too_many_requests', HttpStatus.TOO_MANY_REQUESTS);
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() === HttpStatus.TOO_MANY_REQUESTS) throw err;
      if (err instanceof ServiceUnavailableException) throw err;
      throw failClosedRateLimitUnavailable();
    }
  }
}
