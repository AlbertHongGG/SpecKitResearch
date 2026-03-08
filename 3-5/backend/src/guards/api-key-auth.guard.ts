import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { ApiKeyAuthService } from '../shared/auth/api-key-auth.service';
import type { ApiKeyPrincipal } from '../shared/auth/auth.types';

type RequestWithApiKey = FastifyRequest & { apiKey?: ApiKeyPrincipal };

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeyAuthService: ApiKeyAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithApiKey>();
    const authorization = request.headers['authorization'];

    const auth = await this.apiKeyAuthService.authenticate(
      typeof authorization === 'string' ? authorization : undefined
    );

    if (!auth) {
      throw new UnauthorizedException();
    }

    if (auth.kind === 'ok') {
      request.apiKey = auth.principal;
      return true;
    }

    // Token belongs to an existing key (hash matched) but is not usable.
    // Attach apiKeyId for usage logging and still return 401.
    (request as any).apiKey = { apiKeyId: auth.apiKeyId };
    throw new UnauthorizedException();
  }
}
