export async function seedUser(params: { email: string; password: string; role: 'User' | 'Reviewer' | 'Admin' }) {
  const { hashPassword } = await import('../src/auth/password.js');
  const { prisma } = await import('../src/db/prisma.js');
  const passwordHash = await hashPassword(params.password);
  return prisma.user.create({
    data: {
      email: params.email,
      passwordHash,
      role: params.role,
    },
  });
}

export async function seedActiveTemplate(params: {
  name: string;
  steps: Array<{ stepKey: string; orderIndex: number; mode: 'Serial' | 'Parallel'; assigneeIds: string[] }>;
}) {
  const { prisma } = await import('../src/db/prisma.js');
  return prisma.approvalFlowTemplate.create({
    data: {
      name: params.name,
      isActive: true,
      steps: {
        create: params.steps.map((s) => ({
          stepKey: s.stepKey,
          orderIndex: s.orderIndex,
          mode: s.mode,
          assignees: { create: s.assigneeIds.map((assigneeId) => ({ assigneeId })) },
        })),
      },
    },
    include: {
      steps: { include: { assignees: true }, orderBy: { orderIndex: 'asc' } },
    },
  });
}
