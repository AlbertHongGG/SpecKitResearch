import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../shared/db/prisma.service';

@Injectable()
export class ApiKeyScopesService {
  constructor(private readonly prisma: PrismaService) {}

  async validateScopeNames(scopeNames: string[]): Promise<{ id: string; name: string }[]> {
    const unique = Array.from(new Set(scopeNames));
    if (unique.length !== scopeNames.length) {
      throw new BadRequestException({
        error: { code: 'bad_request', message: 'Duplicate scopes' }
      });
    }

    const scopes = await this.prisma.apiScope.findMany({
      where: { name: { in: unique } },
      select: { id: true, name: true }
    });

    if (scopes.length !== unique.length) {
      throw new BadRequestException({
        error: { code: 'bad_request', message: 'Unknown scope' }
      });
    }

    return scopes;
  }
}
