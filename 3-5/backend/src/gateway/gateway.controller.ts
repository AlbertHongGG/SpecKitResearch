import { All, Controller, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { ScopeGuard } from '../guards/scope.guard';

import { ServiceRoutingService } from './service-routing.service';
import { GatewayEndpointResolveGuard } from './gateway-endpoint-resolve.guard';

@Controller('gateway')
export class GatewayController {
  constructor(private readonly routing: ServiceRoutingService) {}

  @All(':serviceName/*')
  @UseGuards(ApiKeyAuthGuard, GatewayEndpointResolveGuard, ScopeGuard, RateLimitGuard)
  async proxy(@Req() request: FastifyRequest) {
    const params = (request as any).params as { serviceName: string };
    const serviceName = params.serviceName;

    const url = request.url;
    const idx = url.indexOf('?');
    const urlPath = idx === -1 ? url : url.slice(0, idx);
    const prefix = `/gateway/${serviceName}`;
    const upstreamPath = urlPath.startsWith(prefix) ? urlPath.slice(prefix.length) || '/' : urlPath;

    return this.routing.handle(serviceName, request.method, upstreamPath);
  }
}
