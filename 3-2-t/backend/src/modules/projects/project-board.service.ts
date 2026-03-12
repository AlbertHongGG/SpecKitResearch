import { Inject, Injectable } from '@nestjs/common';

import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { IssuesService } from '../issues/issues.service';
import { IssuesRepository } from '../issues/issues.repository';
import { SprintsRepository } from '../sprints/sprints.repository';
import { WorkflowsRepository } from '../workflows/workflows.repository';

@Injectable()
export class ProjectBoardService {
  constructor(
    @Inject(IssuesRepository) private readonly issuesRepository: IssuesRepository,
    @Inject(IssuesService) private readonly issuesService: IssuesService,
    @Inject(WorkflowsRepository) private readonly workflowsRepository: WorkflowsRepository,
    @Inject(SprintsRepository) private readonly sprintsRepository: SprintsRepository,
  ) {}

  async getBoardData(projectId: string) {
    const project = await this.issuesRepository.findProject(projectId);
    if (!project) {
      throw resourceHidden('Project');
    }

    const workflow = await this.workflowsRepository.findActiveWorkflow(projectId);
    if (!workflow) {
      throw resourceHidden('Workflow');
    }

    const activeSprint = await this.sprintsRepository.findActiveSprint(projectId);
    const issues = activeSprint
      ? await this.issuesRepository.listIssuesBySprint(projectId, activeSprint.id)
      : await this.issuesRepository.listIssues(projectId);

    const serializedIssues = issues.map((issue) => this.issuesService.serializeIssue(issue));

    return {
      project: {
        id: project.id,
        key: project.key,
        name: project.name,
        type: project.type,
      },
      activeSprint: activeSprint
        ? {
            id: activeSprint.id,
            name: activeSprint.name,
            status: activeSprint.status,
          }
        : null,
      columns: workflow.statuses.map((status) => ({
        key: status.key,
        name: status.name,
        issues: serializedIssues.filter((issue) => issue.status.key === status.key),
      })),
    };
  }

  async getBacklogData(projectId: string) {
    const project = await this.issuesRepository.findProject(projectId);
    if (!project) {
      throw resourceHidden('Project');
    }

    const sprints = await this.sprintsRepository.listSprints(projectId);
    const backlogIssues = await this.issuesRepository.listIssuesBySprint(projectId, null);

    return {
      project: {
        id: project.id,
        key: project.key,
        name: project.name,
        type: project.type,
      },
      backlogIssues: backlogIssues.map((issue) => this.issuesService.serializeIssue(issue)),
      sprints: await Promise.all(
        sprints.map(async (sprint) => ({
          id: sprint.id,
          name: sprint.name,
          goal: sprint.goal,
          status: sprint.status,
          issues: (await this.issuesRepository.listIssuesBySprint(projectId, sprint.id)).map((issue) =>
            this.issuesService.serializeIssue(issue),
          ),
        })),
      ),
    };
  }
}
