import { prisma } from '../src/repo/prisma.js';
import { hashPassword } from '../src/lib/password.js';

async function main() {
  const passwordHash = await hashPassword('password');

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: { passwordHash, role: 'User' },
    create: { email: 'user@example.com', passwordHash, role: 'User' },
  });

  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@example.com' },
    update: { passwordHash, role: 'Reviewer' },
    create: { email: 'reviewer@example.com', passwordHash, role: 'Reviewer' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash, role: 'Admin' },
    create: { email: 'admin@example.com', passwordHash, role: 'Admin' },
  });

  // Sample flow: single serial step assigned to reviewer.
  const existingFlow = await prisma.approvalFlowTemplate.findFirst({
    where: { name: 'Default Flow' },
  });

  if (!existingFlow) {
    await prisma.approvalFlowTemplate.create({
      data: {
        name: 'Default Flow',
        isActive: true,
        steps: {
          create: [
            {
              stepKey: 'step-1',
              orderIndex: 0,
              mode: 'Serial',
              assignees: {
                create: [{ reviewerId: reviewer.id }],
              },
            },
          ],
        },
      },
    });
  } else {
    await prisma.approvalFlowTemplate.update({
      where: { id: existingFlow.id },
      data: { isActive: true },
    });
  }

  // Keep unused variables from being tree-shaken in future refactors.
  void user;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
