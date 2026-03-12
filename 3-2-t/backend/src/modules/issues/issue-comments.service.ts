import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { sanitizeRichText } from '../../common/security/content-sanitizer';
import { IssueCommentsRepository } from './issue-comments.repository';
import { IssuesAuditService } from './issues.audit';
import { IssuesRepository } from './issues.repository';

@Injectable()
export class IssueCommentsService {
  constructor(
    @Inject(IssuesRepository) private readonly issuesRepository: IssuesRepository,
    @Inject(IssueCommentsRepository) private readonly issueCommentsRepository: IssueCommentsRepository,
    @Inject(IssuesAuditService) private readonly issuesAuditService: IssuesAuditService,
  ) {}

  async createComment(
    projectId: string,
    issueKey: string,
    actor: { userId: string; email: string },
    body: string,
  ) {
    const issue = await this.issuesRepository.findIssueByKey(projectId, issueKey);
    if (!issue) {
      throw resourceHidden('Issue');
    }

    const sanitizedBody = sanitizeRichText(body);
    if (!sanitizedBody) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: 'Comment body is required.',
      });
    }

    const comment = await this.issueCommentsRepository.createComment(issue.id, actor.userId, sanitizedBody);
    const organizationId = issue.project.organizationId;

    await this.issuesAuditService.recordCommentCreated({
      issueId: issue.id,
      commentId: comment.id,
      projectId,
      organizationId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      afterJson: JSON.stringify(comment),
    });

    return comment;
  }
}
