import { prisma } from './prisma.js';

export async function listActiveFlowTemplates() {
  return prisma.approvalFlowTemplate.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
    include: {
      steps: {
        orderBy: { orderIndex: 'asc' },
        include: {
          assignees: {
            include: { reviewer: true },
          },
        },
      },
    },
  });
}

export async function getFlowTemplateById(id: string) {
  return prisma.approvalFlowTemplate.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: { orderIndex: 'asc' },
        include: { assignees: true },
      },
    },
  });
}
