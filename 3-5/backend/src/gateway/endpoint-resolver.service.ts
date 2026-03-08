import { Injectable } from '@nestjs/common';

import type { HttpMethod } from '@prisma/client';

import { PrismaService } from '../shared/db/prisma.service';
import type { ResolvedEndpoint } from '../shared/auth/auth.types';

@Injectable()
export class EndpointResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(method: string, path: string): Promise<ResolvedEndpoint | null> {
    const normalizedMethod = method.toUpperCase() as HttpMethod;
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)) {
      return null;
    }

    const endpoint = await this.prisma.apiEndpoint.findFirst({
      where: {
        method: normalizedMethod,
        path,
        status: 'active',
        service: { status: 'active' }
      },
      include: { service: true }
    });

    if (!endpoint) return null;

    return {
      endpointId: endpoint.id,
      serviceId: endpoint.serviceId,
      method: endpoint.method,
      path: endpoint.path
    };
  }
}
