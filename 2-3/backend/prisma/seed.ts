import { PrismaClient } from '@prisma/client';

import { hashPassword } from '../src/domain/auth/password.js';

const prisma = new PrismaClient();

async function main() {
    const ownerEmail = 'owner@example.com';
    const memberEmail = 'member@example.com';
    const defaultPassword = 'password1234';

    const [ownerHash, memberHash] = await Promise.all([
        hashPassword(defaultPassword),
        hashPassword(defaultPassword),
    ]);

    const owner = await prisma.user.upsert({
        where: { email: ownerEmail },
        update: {
            displayName: 'Seed Owner',
            passwordHash: ownerHash,
        },
        create: {
            email: ownerEmail,
            displayName: 'Seed Owner',
            passwordHash: ownerHash,
        },
    });

    const member = await prisma.user.upsert({
        where: { email: memberEmail },
        update: {
            displayName: 'Seed Member',
            passwordHash: memberHash,
        },
        create: {
            email: memberEmail,
            displayName: 'Seed Member',
            passwordHash: memberHash,
        },
    });

    await prisma.project.deleteMany({
        where: {
            ownerId: owner.id,
            name: 'Seed Project',
        },
    });

    const project = await prisma.project.create({
        data: {
            name: 'Seed Project',
            description: 'Project for local testing',
            ownerId: owner.id,
            memberships: {
                create: [
                    { userId: owner.id, role: 'owner' },
                    { userId: member.id, role: 'member' },
                ],
            },
        },
    });

    const board = await prisma.board.create({
        data: {
            projectId: project.id,
            name: 'Main Board',
            order: 1,
        },
    });

    const todoList = await prisma.list.create({
        data: {
            boardId: board.id,
            title: 'To Do',
            order: 1,
        },
    });

    const doingList = await prisma.list.create({
        data: {
            boardId: board.id,
            title: 'Doing',
            order: 2,
            isWipLimited: true,
            wipLimit: 2,
        },
    });

    const doneList = await prisma.list.create({
        data: {
            boardId: board.id,
            title: 'Done',
            order: 3,
        },
    });

    const setupTask = await prisma.task.create({
        data: {
            projectId: project.id,
            boardId: board.id,
            listId: todoList.id,
            title: 'Verify local setup',
            description: 'Confirm backend/frontend and authentication are working.',
            position: 'a0',
            status: 'open',
            createdByUserId: owner.id,
            assignees: {
                create: [{ userId: owner.id }],
            },
        },
    });

    const apiTask = await prisma.task.create({
        data: {
            projectId: project.id,
            boardId: board.id,
            listId: doingList.id,
            title: 'Test API endpoints',
            description: 'Run authentication and board/list/task endpoint tests.',
            position: 'a1',
            status: 'in_progress',
            createdByUserId: owner.id,
            assignees: {
                create: [{ userId: member.id }],
            },
        },
    });

    await prisma.task.create({
        data: {
            projectId: project.id,
            boardId: board.id,
            listId: doneList.id,
            title: 'Initial schema migration',
            description: 'Prisma schema and initial migrations are applied.',
            position: 'a2',
            status: 'done',
            createdByUserId: owner.id,
        },
    });

    await prisma.comment.createMany({
        data: [
            {
                taskId: setupTask.id,
                authorId: owner.id,
                content: 'Seeded by prisma/seed.ts',
            },
            {
                taskId: apiTask.id,
                authorId: member.id,
                content: 'Ready for endpoint integration tests.',
            },
        ],
    });

    console.log('Seed complete');
    console.log(`Owner  : ${ownerEmail} / ${defaultPassword}`);
    console.log(`Member : ${memberEmail} / ${defaultPassword}`);
    console.log(`Project: ${project.name}`);
}

main()
    .catch((error) => {
        console.error(error);
        throw error;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
