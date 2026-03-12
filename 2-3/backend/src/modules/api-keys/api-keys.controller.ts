import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequireSessionGuard } from '../../guards/require-session.guard';
import type { SessionPrincipal } from '../../shared/auth/auth.types';

import { ApiKeyCreateDto, ApiKeyUpdateDto } from './api-keys.dto';
import { presentApiKey, presentApiKeyCreateResponse } from './api-keys.presenter';
import { ApiKeysService } from './api-keys.service';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

@Controller('api-keys')
@UseGuards(RequireSessionGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  async list(@Req() request: RequestWithSession) {
    const keys = await this.apiKeysService.listForUser(request.session!.userId);
    return keys.map(presentApiKey);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: ApiKeyCreateDto, @Req() request: RequestWithSession) {
    const expiresAt = body.expires_at ? new Date(body.expires_at) : null;

    const { apiKey, plaintext } = await this.apiKeysService.createForPrincipal(request.session!, {
      name: body.name,
      scopes: body.scopes,
      expiresAt,
      rateLimitPerMinute: body.rate_limit_per_minute ?? null,
      rateLimitPerHour: body.rate_limit_per_hour ?? null,
      replacesApiKeyId: body.replaces_api_key_id ?? null,
    });

    return presentApiKeyCreateResponse(apiKey, plaintext);
  }

  @Patch(':apiKeyId')
  async update(
    @Param('apiKeyId') apiKeyId: string,
    @Body() body: ApiKeyUpdateDto,
    @Req() request: RequestWithSession,
  ) {
    const updated = await this.apiKeysService.updateForPrincipal(request.session!, apiKeyId, {
      ...(typeof body.name === 'string' ? { name: body.name } : {}),
      ...(Array.isArray(body.scopes) ? { scopes: body.scopes } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'expires_at')
        ? { expiresAt: body.expires_at ? new Date(body.expires_at) : null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'rate_limit_per_minute')
        ? { rateLimitPerMinute: body.rate_limit_per_minute ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'rate_limit_per_hour')
        ? { rateLimitPerHour: body.rate_limit_per_hour ?? null }
        : {}),
    });

    return presentApiKey(updated);
  }

  @Post(':apiKeyId/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param('apiKeyId') apiKeyId: string, @Req() request: RequestWithSession) {
    await this.apiKeysService.revokeForPrincipal(request.session!, apiKeyId);
  }
}
