import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { ProjectMemberGuard } from '../../common/guards/project-member.guard.js';

@Controller('projects/:projectId/backlog')
export class BacklogController {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLimit(limit: unknown) {
    const n = typeof limit === 'string' ? Number(limit) : typeof limit === 'number' ? limit : 50;
    if (!Number.isFinite(n) || n <= 0) return 50;
    return Math.min(50, Math.floor(n));
  }

  @Get()
  @UseGuards(SessionGuard, ProjectMemberGuard)
  async listBacklog(
    @Param('projectId') projectId: string,
    @Query('limit') limit: string | undefined,
    @Query('cursor') cursor: string | undefined,
  ) {
    const take = this.normalizeLimit(limit);

    const issues = await this.prisma.issue.findMany({
      where: { projectId, sprintId: null },
      include: { status: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const nextCursor = issues.length > take ? issues[issues.length - 1]!.id : null;
    const page = issues.slice(0, take);

    return {
      issues: page.map((i) => ({
        issueKey: i.issueKey,
        type: i.type,
        title: i.title,
        priority: i.priority,
        statusKey: i.status.key,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
      nextCursor,
    };
  }
}
