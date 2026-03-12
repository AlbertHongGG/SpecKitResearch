import { Injectable } from '@nestjs/common';

import { PrismaService } from '../db/prisma.service';

@Injectable()
export class ScopeAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async isAllowed(endpointId: string, apiKeyScopes: string[]): Promise<boolean> {
    if (apiKeyScopes.length === 0) return false;

    const rule = await this.prisma.apiScopeRule.findFirst({
      where: {
        endpointId,
        effect: 'allow',
        scope: { name: { in: apiKeyScopes } }
      },
      select: { id: true }
    });

    return Boolean(rule);
  }
}
