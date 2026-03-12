import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { IssueEpicLinksRepository } from './issue-epic-links.repository';

type PrismaExecutor = Prisma.TransactionClient;

@Injectable()
export class IssueEpicLinksService {
  constructor(@Inject(IssueEpicLinksRepository) private readonly epicLinksRepository: IssueEpicLinksRepository) {}

  async replaceEpicLink(
    projectId: string,
    issue: { id: string; issueKey: string },
    epicIssueKey: string | null,
    executor: PrismaExecutor,
  ): Promise<{ previousEpicIssueKey: string | null; nextEpicIssueKey: string | null }> {
    const existing = await this.epicLinksRepository.findCurrentLink(issue.id, executor);
    const previousEpicIssueKey = existing?.epicIssue.issueKey ?? null;

    await this.epicLinksRepository.clearLink(issue.id, executor);

    if (!epicIssueKey) {
      return {
        previousEpicIssueKey,
        nextEpicIssueKey: null,
      };
    }

    const epic = await this.epicLinksRepository.findEpicByKey(projectId, epicIssueKey, executor);
    if (!epic || epic.type !== 'epic' || epic.id === issue.id) {
      throw new ConflictException({
        code: ERROR_CODES.EPIC_LINK_INVALID,
        message: 'Epic link must target another epic issue in the same project.',
      });
    }

    await this.epicLinksRepository.createLink(epic.id, issue.id, executor);
    return {
      previousEpicIssueKey,
      nextEpicIssueKey: epic.issueKey,
    };
  }
}
