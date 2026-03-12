import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class IssueKeyGeneratorService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async generateNextIssueKey(projectId: string, projectKey: string, executor: PrismaExecutor = this.prisma): Promise<string> {
    const issues = await executor.issue.findMany({
      where: { projectId },
      select: { issueKey: true },
    });

    const maxSequence = issues.reduce((maxValue, issue) => {
      const suffix = this.parseSequence(projectKey, issue.issueKey);
      return suffix > maxValue ? suffix : maxValue;
    }, 0);

    return `${projectKey}-${maxSequence + 1}`;
  }

  private parseSequence(projectKey: string, issueKey: string): number {
    const prefix = `${projectKey}-`;
    if (!issueKey.startsWith(prefix)) {
      return 0;
    }

    const value = Number(issueKey.slice(prefix.length));
    return Number.isFinite(value) ? value : 0;
  }
}
