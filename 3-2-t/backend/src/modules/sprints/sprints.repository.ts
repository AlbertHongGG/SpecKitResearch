import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type Project, type Sprint } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SprintsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findProject(projectId: string, executor: PrismaExecutor = this.prisma): Promise<Project | null> {
    return executor.project.findUnique({
      where: { id: projectId },
    });
  }

  listSprints(projectId: string, executor: PrismaExecutor = this.prisma): Promise<Sprint[]> {
    return executor.sprint.findMany({
      where: { projectId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findSprint(projectId: string, sprintId: string, executor: PrismaExecutor = this.prisma): Promise<Sprint | null> {
    return executor.sprint.findFirst({
      where: {
        id: sprintId,
        projectId,
      },
    });
  }

  findActiveSprint(projectId: string, executor: PrismaExecutor = this.prisma): Promise<Sprint | null> {
    return executor.sprint.findFirst({
      where: {
        projectId,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  createSprint(
    input: { projectId: string; name: string; goal?: string | null; startDate?: Date | null; endDate?: Date | null },
    executor: PrismaExecutor = this.prisma,
  ) {
    return executor.sprint.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        goal: input.goal,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });
  }

  updateSprint(sprintId: string, data: Prisma.SprintUpdateInput, executor: PrismaExecutor = this.prisma) {
    return executor.sprint.update({
      where: { id: sprintId },
      data,
    });
  }
}
