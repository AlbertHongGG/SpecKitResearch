import 'dotenv/config';

import { createPrismaClient } from '../src/db/prisma';
import { hashPassword } from '../src/domain/auth/password';
import { generateBetween } from '../src/domain/ordering/position';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for seeding');
}

const prisma = createPrismaClient(databaseUrl);

async function main() {
  const ownerEmail = 'dev-owner@example.com';
  const memberEmail = 'dev-member@example.com';
  const password = 'password123';

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { displayName: 'Dev Owner' },
    create: {
      email: ownerEmail,
      passwordHash: await hashPassword(password),
      displayName: 'Dev Owner',
    },
  });

  const member = await prisma.user.upsert({
    where: { email: memberEmail },
    update: { displayName: 'Dev Member' },
    create: {
      email: memberEmail,
      passwordHash: await hashPassword(password),
      displayName: 'Dev Member',
    },
  });

  const projectId = `dev-project-${owner.id}`;
  const project = await prisma.project.upsert({
    where: { id: projectId },
    update: {
      name: 'Dev Project',
      description: 'Seeded project for local development',
      visibility: 'private',
    },
    create: {
      id: projectId,
      name: 'Dev Project',
      description: 'Seeded project for local development',
      ownerId: owner.id,
      visibility: 'private',
    },
  });

  await prisma.projectMembership.upsert({
    where: { projectId_userId: { projectId: project.id, userId: owner.id } },
    update: { role: 'owner' },
    create: { projectId: project.id, userId: owner.id, role: 'owner' },
  });

  await prisma.projectMembership.upsert({
    where: { projectId_userId: { projectId: project.id, userId: member.id } },
    update: { role: 'member' },
    create: { projectId: project.id, userId: member.id, role: 'member' },
  });

  const board = await prisma.board.upsert({
    where: { id: `dev-board-${project.id}` },
    update: { name: 'Board A', order: 0 },
    create: { id: `dev-board-${project.id}`, projectId: project.id, name: 'Board A', order: 0 },
  });

  const todoList = await prisma.list.upsert({
    where: { id: `dev-list-todo-${board.id}` },
    update: { title: 'Todo', order: 0 },
    create: { id: `dev-list-todo-${board.id}`, boardId: board.id, title: 'Todo', order: 0 },
  });

  await prisma.list.upsert({
    where: { id: `dev-list-doing-${board.id}` },
    update: { title: 'Doing', order: 1 },
    create: { id: `dev-list-doing-${board.id}`, boardId: board.id, title: 'Doing', order: 1 },
  });

  const firstPosition = generateBetween(null, null);

  await prisma.task.upsert({
    where: { id: `dev-task-${project.id}` },
    update: { title: 'Hello Trello Lite', listId: todoList.id, boardId: board.id, position: firstPosition },
    create: {
      id: `dev-task-${project.id}`,
      projectId: project.id,
      boardId: board.id,
      listId: todoList.id,
      title: 'Hello Trello Lite',
      description: 'This task was created by prisma/seed.ts',
      position: firstPosition,
      createdByUserId: owner.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed completed.');
  // eslint-disable-next-line no-console
  console.log(`Owner: ${ownerEmail} / ${password}`);
  // eslint-disable-next-line no-console
  console.log(`Member: ${memberEmail} / ${password}`);
  // eslint-disable-next-line no-console
  console.log(`Project: ${project.id}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
