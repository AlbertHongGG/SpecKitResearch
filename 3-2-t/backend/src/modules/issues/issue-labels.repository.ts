import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class IssueLabelsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async replaceLabels(issueId: string, labels: string[], executor: PrismaExecutor = this.prisma): Promise<void> {
    const normalizedLabels = Array.from(
      new Set(labels.map((label) => label.trim()).filter((label) => label.length > 0)),
    );

    await executor.issueLabel.deleteMany({
      where: { issueId },
    });

    if (normalizedLabels.length === 0) {
      return;
    }

    await executor.issueLabel.createMany({
      data: normalizedLabels.map((label) => ({
        issueId,
        label,
      })),
    });
  }
}
