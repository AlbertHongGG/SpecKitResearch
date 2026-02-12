import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/auth/password.js';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const passwordHash = await hashPassword('password1234');

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      displayName: 'Platform Admin',
      platformRole: { create: { role: 'platform_admin' } },
    },
    include: { platformRole: true },
  });

  const org = await prisma.organization.create({
    data: {
      name: 'Demo Org',
      plan: 'free',
      status: 'active',
      createdByUserId: user.id,
      memberships: {
        create: {
          userId: user.id,
          orgRole: 'org_admin',
        },
      },
    },
  });

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      key: 'PROJ',
      name: 'Demo Project',
      type: 'kanban',
      status: 'active',
      createdByUserId: user.id,
      memberships: {
        create: {
          userId: user.id,
          projectRole: 'project_manager',
        },
      },
      issueCounter: {
        create: { nextNumber: 0 },
      },
      workflows: {
        create: {
          name: 'Default',
          version: 1,
          isActive: true,
          createdByUserId: user.id,
          statuses: {
            create: [
              { key: 'todo', name: 'To Do', position: 1 },
              { key: 'in_progress', name: 'In Progress', position: 2 },
              { key: 'done', name: 'Done', position: 3 },
            ],
          },
        },
      },
    },
    include: { workflows: { include: { statuses: true } } },
  });

  // Add default transitions for workflow
  const wf = project.workflows[0];
  const byKey = Object.fromEntries(wf.statuses.map((s) => [s.key, s] as const));

  await prisma.workflowTransition.deleteMany({ where: { workflowId: wf.id } });
  await prisma.workflowTransition.createMany({
    data: [
      {
        workflowId: wf.id,
        fromStatusId: byKey.todo.id,
        toStatusId: byKey.in_progress.id,
      },
      {
        workflowId: wf.id,
        fromStatusId: byKey.in_progress.id,
        toStatusId: byKey.done.id,
      },
      {
        workflowId: wf.id,
        fromStatusId: byKey.todo.id,
        toStatusId: byKey.done.id,
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log({ user: user.email, orgId: org.id, projectId: project.id });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
