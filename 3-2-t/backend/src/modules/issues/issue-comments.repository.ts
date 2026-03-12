import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class IssueCommentsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  createComment(
    issueId: string,
    authorUserId: string,
    body: string,
    executor: PrismaExecutor = this.prisma,
  ) {
    return executor.issueComment.create({
      data: {
        issueId,
        authorUserId,
        body,
      },
    });
  }
}
