import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import type { ApiKeyPrincipal, ResolvedEndpoint } from '../shared/auth/auth.types';

import { EndpointResolverService } from './endpoint-resolver.service';

type RequestWithGatewayContext = FastifyRequest & {
  apiKey?: ApiKeyPrincipal;
  resolvedEndpoint?: ResolvedEndpoint;
};

function pathOnly(url: string): string {
  const idx = url.indexOf('?');
  return idx === -1 ? url : url.slice(0, idx);
}

@Injectable()
export class GatewayEndpointResolveGuard implements CanActivate {
  constructor(private readonly endpointResolver: EndpointResolverService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithGatewayContext>();
    if (!request.apiKey) throw new UnauthorizedException();

    const params = (request as any).params as { serviceName?: string } | undefined;
    const serviceName = params?.serviceName;
    if (!serviceName) throw new ForbiddenException();

    const urlPath = pathOnly(request.url);
    const prefix = `/gateway/${serviceName}`;
    const upstreamPath = urlPath.startsWith(prefix) ? urlPath.slice(prefix.length) || '/' : urlPath;

    const resolved = await this.endpointResolver.resolve(request.method, upstreamPath);
    if (!resolved) throw new ForbiddenException();

    request.resolvedEndpoint = resolved;
    return true;
  }
}
