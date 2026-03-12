import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { ProjectMemberGuard } from '../../common/guards/project-member.guard.js';
import { ProjectRoleGuard, RequireProjectRoles } from '../../common/guards/project-role.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const toggleSchema = z.object({ type: z.string().min(1), isEnabled: z.boolean() });

@Controller('projects/:projectId/issue-types')
export class IssueTypesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(SessionGuard, ProjectMemberGuard)
  async listTypes(@Param('projectId') projectId: string) {
    const rows = await this.prisma.projectIssueType.findMany({
      where: { projectId },
      orderBy: { type: 'asc' },
    });

    return { issueTypes: rows.map((r) => ({ type: r.type, isEnabled: r.isEnabled })) };
  }

  @Patch()
  @RequireProjectRoles('project_manager')
  @UseGuards(SessionGuard, ProjectRoleGuard, ReadOnlyGuard)
  async toggleType(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(toggleSchema)) body: z.infer<typeof toggleSchema>,
  ) {
    await this.prisma.projectIssueType.upsert({
      where: { projectId_type: { projectId, type: body.type } },
      update: { isEnabled: body.isEnabled },
      create: { projectId, type: body.type, isEnabled: body.isEnabled },
    });

    return { ok: true };
  }
}
