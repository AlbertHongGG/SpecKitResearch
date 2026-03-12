import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { AuditLogService } from '../audit/audit-log.service';
import { SprintsRepository } from './sprints.repository';

@Injectable()
export class SprintsService {
  constructor(
    @Inject(SprintsRepository) private readonly sprintsRepository: SprintsRepository,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  async listSprints(projectId: string) {
    const project = await this.sprintsRepository.findProject(projectId);
    if (!project) {
      throw resourceHidden('Project');
    }

    const sprints = await this.sprintsRepository.listSprints(projectId);
    return sprints.map((sprint) => this.serializeSprint(sprint));
  }

  async createSprint(
    projectId: string,
    input: { name?: string; goal?: string | null; startDate?: string | null; endDate?: string | null },
    actor: { userId: string; email: string },
  ) {
    const project = await this.sprintsRepository.findProject(projectId);
    if (!project) {
      throw resourceHidden('Project');
    }
    this.assertScrumProject(project.type);

    const name = input.name?.trim();
    if (!name) {
      throw new ConflictException({
        code: ERROR_CODES.SPRINT_INVALID,
        message: 'Sprint name is required.',
      });
    }

    const sprint = await this.sprintsRepository.createSprint({
      projectId,
      name,
      goal: input.goal ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    });

    await this.auditLogService.record({
      action: 'sprint_created',
      entityType: 'sprint',
      entityId: sprint.id,
      projectId,
      organizationId: project.organizationId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      afterJson: JSON.stringify(this.serializeSprint(sprint)),
    });

    return this.serializeSprint(sprint);
  }

  async startSprint(projectId: string, sprintId: string, actor: { userId: string; email: string }) {
    const project = await this.sprintsRepository.findProject(projectId);
    if (!project) {
      throw resourceHidden('Project');
    }
    this.assertScrumProject(project.type);

    const sprint = await this.sprintsRepository.findSprint(projectId, sprintId);
    if (!sprint) {
      throw resourceHidden('Sprint');
    }
    if (sprint.status !== 'planned') {
      throw this.invalid('Only planned sprints can be started.');
    }

    const activeSprint = await this.sprintsRepository.findActiveSprint(projectId);
    if (activeSprint) {
      throw this.invalid('Close the current active sprint before starting another sprint.');
    }

    const updated = await this.sprintsRepository.updateSprint(sprint.id, { status: 'active' });
    await this.auditLogService.record({
      action: 'sprint_started',
      entityType: 'sprint',
      entityId: sprint.id,
      projectId,
      organizationId: project.organizationId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      afterJson: JSON.stringify(this.serializeSprint(updated)),
    });

    return this.serializeSprint(updated);
  }

  async closeSprint(projectId: string, sprintId: string, actor: { userId: string; email: string }) {
    const project = await this.sprintsRepository.findProject(projectId);
    if (!project) {
      throw resourceHidden('Project');
    }
    this.assertScrumProject(project.type);

    const sprint = await this.sprintsRepository.findSprint(projectId, sprintId);
    if (!sprint) {
      throw resourceHidden('Sprint');
    }
    if (sprint.status !== 'active') {
      throw this.invalid('Only active sprints can be closed.');
    }

    const updated = await this.sprintsRepository.updateSprint(sprint.id, { status: 'closed' });
    await this.auditLogService.record({
      action: 'sprint_ended',
      entityType: 'sprint',
      entityId: sprint.id,
      projectId,
      organizationId: project.organizationId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      afterJson: JSON.stringify(this.serializeSprint(updated)),
    });

    return this.serializeSprint(updated);
  }

  private assertScrumProject(projectType: string): void {
    if (projectType !== 'scrum') {
      throw this.invalid('Sprints are only available for scrum projects.');
    }
  }

  private invalid(message: string): ConflictException {
    return new ConflictException({
      code: ERROR_CODES.SPRINT_INVALID,
      message,
    });
  }

  private serializeSprint(sprint: { id: string; name: string; goal: string | null; status: string; startDate: Date | null; endDate: Date | null }) {
    return {
      id: sprint.id,
      name: sprint.name,
      goal: sprint.goal,
      status: sprint.status,
      startDate: sprint.startDate?.toISOString() ?? null,
      endDate: sprint.endDate?.toISOString() ?? null,
    };
  }
}
