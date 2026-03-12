import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SeedFixtures {
  users: {
    platformAdminId: string;
    orgAdminId: string;
    developerId: string;
    outsiderId: string;
  };
  organizations: {
    alphaOrgId: string;
    betaOrgId: string;
    suspendedOrgId: string;
  };
  projects: {
    alphaProjectId: string;
    alphaProjectKey: string;
    betaArchivedProjectId: string;
    betaArchivedProjectKey: string;
  };
  workflows: {
    activeWorkflowId: string;
    todoStatusId: string;
    inProgressStatusId: string;
    doneStatusId: string;
  };
  issues: {
    epicIssueKey: string;
    storyIssueKey: string;
    bugIssueKey: string;
  };
  sprints: {
    activeSprintId: string;
  };
  inviteToken: string;
}

export async function resetDatabase(client: PrismaClient): Promise<void> {
  await client.auditLog.deleteMany();
  await client.issueComment.deleteMany();
  await client.issueEpicLink.deleteMany();
  await client.issueLabel.deleteMany();
  await client.issue.deleteMany();
  await client.sprint.deleteMany();
  await client.workflowTransition.deleteMany();
  await client.workflowStatus.deleteMany();
  await client.workflow.deleteMany();
  await client.projectMembership.deleteMany();
  await client.project.deleteMany();
  await client.organizationInvite.deleteMany();
  await client.organizationMembership.deleteMany();
  await client.organization.deleteMany();
  await client.platformRole.deleteMany();
  await client.user.deleteMany();
}

export async function seedBaseData(client: PrismaClient): Promise<SeedFixtures> {
  await resetDatabase(client);

  const seededAt = new Date('2026-03-08T12:00:00.000Z');

  const platformAdmin = await client.user.create({
    data: {
      id: 'user-platform-admin',
      email: 'platform-admin@example.com',
      passwordHash: 'platform-admin-password',
      displayName: 'Platform Admin',
    },
  });
  const orgAdmin = await client.user.create({
    data: {
      id: 'user-org-admin',
      email: 'org-admin@example.com',
      passwordHash: 'org-admin-password',
      displayName: 'Organization Admin',
    },
  });
  const developer = await client.user.create({
    data: {
      id: 'user-developer',
      email: 'developer@example.com',
      passwordHash: 'developer-password',
      displayName: 'Developer User',
    },
  });
  const outsider = await client.user.create({
    data: {
      id: 'user-outsider',
      email: 'outsider@example.com',
      passwordHash: 'outsider-password',
      displayName: 'Outside User',
    },
  });

  await client.platformRole.create({
    data: {
      userId: platformAdmin.id,
      role: 'platform_admin',
    },
  });

  const alphaOrg = await client.organization.create({
    data: {
      id: 'org-alpha',
      name: 'Alpha Organization',
      createdByUserId: platformAdmin.id,
      plan: 'paid',
      createdAt: seededAt,
    },
  });
  const betaOrg = await client.organization.create({
    data: {
      id: 'org-beta',
      name: 'Beta Organization',
      createdByUserId: platformAdmin.id,
      plan: 'free',
      createdAt: seededAt,
    },
  });
  const suspendedOrg = await client.organization.create({
    data: {
      id: 'org-suspended',
      name: 'Suspended Organization',
      createdByUserId: platformAdmin.id,
      plan: 'paid',
      status: 'suspended',
      createdAt: seededAt,
    },
  });

  await client.organizationMembership.create({
    data: { organizationId: alphaOrg.id, userId: orgAdmin.id, orgRole: 'org_admin', status: 'active' },
  });
  await client.organizationMembership.create({
    data: { organizationId: betaOrg.id, userId: orgAdmin.id, orgRole: 'org_admin', status: 'active' },
  });
  await client.organizationMembership.create({
    data: { organizationId: alphaOrg.id, userId: developer.id, orgRole: 'org_member', status: 'active' },
  });
  await client.organizationMembership.create({
    data: { organizationId: alphaOrg.id, userId: platformAdmin.id, orgRole: 'org_admin', status: 'active' },
  });

  const project = await client.project.create({
    data: {
      id: 'project-alpha',
      organizationId: alphaOrg.id,
      key: 'ALPHA',
      name: 'Alpha Project',
      type: 'scrum',
      createdByUserId: orgAdmin.id,
      createdAt: seededAt,
    },
  });
  const archivedProject = await client.project.create({
    data: {
      id: 'project-beta-archive',
      organizationId: betaOrg.id,
      key: 'BETA',
      name: 'Beta Archived Project',
      type: 'kanban',
      status: 'archived',
      createdByUserId: orgAdmin.id,
      createdAt: seededAt,
    },
  });

  await client.projectMembership.create({
    data: { projectId: project.id, userId: orgAdmin.id, projectRole: 'project_manager' },
  });
  await client.projectMembership.create({
    data: { projectId: project.id, userId: developer.id, projectRole: 'developer' },
  });
  await client.projectMembership.create({
    data: { projectId: archivedProject.id, userId: orgAdmin.id, projectRole: 'project_manager' },
  });

  const archivedWorkflow = await client.workflow.create({
    data: {
      id: 'workflow-beta-archive-v1',
      projectId: archivedProject.id,
      name: 'Archived workflow',
      version: 1,
      isActive: true,
      createdByUserId: orgAdmin.id,
      createdAt: seededAt,
    },
  });

  const archivedTodoStatus = await client.workflowStatus.create({
    data: {
      id: 'status-beta-archive-todo',
      workflowId: archivedWorkflow.id,
      key: 'todo',
      name: 'To Do',
      position: 1,
    },
  });

  await client.workflowStatus.create({
    data: {
      id: 'status-beta-archive-done',
      workflowId: archivedWorkflow.id,
      key: 'done',
      name: 'Done',
      position: 2,
    },
  });

  await client.issue.create({
    data: {
      id: 'issue-beta-archive-1',
      projectId: archivedProject.id,
      issueKey: 'BETA-1',
      type: 'task',
      title: 'Archived release checklist',
      description: 'Historical issue used to validate archived project read-only behavior.',
      priority: 'medium',
      statusId: archivedTodoStatus.id,
      reporterUserId: orgAdmin.id,
      assigneeUserId: orgAdmin.id,
      updatedVersion: 1,
      createdAt: seededAt,
    },
  });

  const workflow = await client.workflow.create({
    data: {
      id: 'workflow-alpha-v1',
      projectId: project.id,
      name: 'Default workflow',
      version: 1,
      isActive: true,
      createdByUserId: orgAdmin.id,
      createdAt: seededAt,
    },
  });

  const todoStatus = await client.workflowStatus.create({
    data: {
      id: 'status-alpha-todo',
      workflowId: workflow.id,
      key: 'todo',
      name: 'To Do',
      position: 1,
    },
  });

  const inProgressStatus = await client.workflowStatus.create({
    data: {
      id: 'status-alpha-in-progress',
      workflowId: workflow.id,
      key: 'in_progress',
      name: 'In Progress',
      position: 2,
    },
  });

  const doneStatus = await client.workflowStatus.create({
    data: {
      id: 'status-alpha-done',
      workflowId: workflow.id,
      key: 'done',
      name: 'Done',
      position: 3,
    },
  });

  await client.workflowTransition.createMany({
    data: [
      {
        workflowId: workflow.id,
        fromStatusId: todoStatus.id,
        toStatusId: inProgressStatus.id,
      },
      {
        workflowId: workflow.id,
        fromStatusId: inProgressStatus.id,
        toStatusId: doneStatus.id,
      },
      {
        workflowId: workflow.id,
        fromStatusId: todoStatus.id,
        toStatusId: doneStatus.id,
      },
      {
        workflowId: workflow.id,
        fromStatusId: inProgressStatus.id,
        toStatusId: todoStatus.id,
      },
    ],
  });

  const sprint = await client.sprint.create({
    data: {
      id: 'sprint-alpha-1',
      projectId: project.id,
      name: 'Sprint 1',
      goal: 'Deliver baseline issue flow',
      startDate: new Date('2026-03-10T00:00:00.000Z'),
      endDate: new Date('2026-03-17T00:00:00.000Z'),
      status: 'active',
      createdAt: seededAt,
    },
  });

  const epic = await client.issue.create({
    data: {
      id: 'issue-alpha-epic',
      projectId: project.id,
      issueKey: 'ALPHA-1',
      type: 'epic',
      title: 'Workspace governance epic',
      description: 'Track governance across workflow and issue lifecycle.',
      priority: 'high',
      statusId: todoStatus.id,
      reporterUserId: orgAdmin.id,
      assigneeUserId: orgAdmin.id,
      updatedVersion: 1,
      createdAt: seededAt,
    },
  });

  const story = await client.issue.create({
    data: {
      id: 'issue-alpha-story',
      projectId: project.id,
      issueKey: 'ALPHA-2',
      type: 'story',
      title: 'Board transition interactions',
      description: 'Allow issues to move between workflow columns.',
      priority: 'medium',
      statusId: inProgressStatus.id,
      reporterUserId: orgAdmin.id,
      assigneeUserId: developer.id,
      sprintId: sprint.id,
      estimate: 8,
      updatedVersion: 1,
      createdAt: seededAt,
    },
  });

  const bug = await client.issue.create({
    data: {
      id: 'issue-alpha-bug',
      projectId: project.id,
      issueKey: 'ALPHA-3',
      type: 'bug',
      title: 'Backlog sorting regression',
      description: 'Investigate ordering for backlog cards.',
      priority: 'critical',
      statusId: todoStatus.id,
      reporterUserId: developer.id,
      assigneeUserId: developer.id,
      updatedVersion: 1,
      createdAt: seededAt,
    },
  });

  await client.issueLabel.createMany({
    data: [
      { issueId: story.id, label: 'board' },
      { issueId: story.id, label: 'frontend' },
      { issueId: bug.id, label: 'bugfix' },
    ],
  });

  await client.issueEpicLink.create({
    data: {
      epicIssueId: epic.id,
      childIssueId: story.id,
    },
  });

  await client.issueComment.create({
    data: {
      issueId: story.id,
      authorUserId: orgAdmin.id,
      body: 'Board transition flow needs verification on the scrum board.',
      createdAt: seededAt,
    },
  });

  const inviteToken = 'alpha-member-invite';
  await client.organizationInvite.create({
    data: {
      id: 'invite-alpha-member',
      token: inviteToken,
      organizationId: alphaOrg.id,
      email: 'outsider@example.com',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      invitedByUserId: orgAdmin.id,
    },
  });

  return {
    users: {
      platformAdminId: platformAdmin.id,
      orgAdminId: orgAdmin.id,
      developerId: developer.id,
      outsiderId: outsider.id,
    },
    organizations: {
      alphaOrgId: alphaOrg.id,
      betaOrgId: betaOrg.id,
      suspendedOrgId: suspendedOrg.id,
    },
    projects: {
      alphaProjectId: project.id,
      alphaProjectKey: project.key,
      betaArchivedProjectId: archivedProject.id,
      betaArchivedProjectKey: archivedProject.key,
    },
    workflows: {
      activeWorkflowId: workflow.id,
      todoStatusId: todoStatus.id,
      inProgressStatusId: inProgressStatus.id,
      doneStatusId: doneStatus.id,
    },
    issues: {
      epicIssueKey: epic.issueKey,
      storyIssueKey: story.issueKey,
      bugIssueKey: bug.issueKey,
    },
    sprints: {
      activeSprintId: sprint.id,
    },
    inviteToken,
  };
}

async function main(): Promise<void> {
  await seedBaseData(prisma);
}

if (process.argv[1]?.endsWith('seed.ts')) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
