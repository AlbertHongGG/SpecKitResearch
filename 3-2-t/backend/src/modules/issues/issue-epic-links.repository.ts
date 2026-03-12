import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type Issue } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class IssueEpicLinksRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findCurrentLink(childIssueId: string, executor: PrismaExecutor = this.prisma) {
    return executor.issueEpicLink.findFirst({
      where: { childIssueId },
      include: {
        epicIssue: true,
      },
    });
  }

  findEpicByKey(projectId: string, issueKey: string, executor: PrismaExecutor = this.prisma): Promise<Issue | null> {
    return executor.issue.findUnique({
      where: {
        projectId_issueKey: {
          projectId,
          issueKey,
        },
      },
    });
  }

  async clearLink(childIssueId: string, executor: PrismaExecutor = this.prisma): Promise<void> {
    await executor.issueEpicLink.deleteMany({
      where: { childIssueId },
    });
  }

  createLink(epicIssueId: string, childIssueId: string, executor: PrismaExecutor = this.prisma) {
    return executor.issueEpicLink.create({
      data: {
        epicIssueId,
        childIssueId,
      },
    });
  }
}
