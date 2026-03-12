import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { throwNotFound } from '../../common/rbac/existence-strategy.js';

@Injectable()
export class IssueKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async allocateIssueKey(projectId: string): Promise<string> {
    return await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
        select: { id: true, key: true },
      });
      if (!project) {
        throwNotFound();
      }

      const counter = await tx.projectIssueCounter.update({
        where: { projectId },
        data: { nextNumber: { increment: 1 } },
      });

      return `${project.key}-${counter.nextNumber}`;
    });
  }
}
