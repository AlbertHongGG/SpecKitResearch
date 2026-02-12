import { prisma } from '../db/prisma.js';

export const flowRepository = {
  listTemplates() {
    return prisma.approvalFlowTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        steps: { include: { assignees: true }, orderBy: { orderIndex: 'asc' } },
      },
    });
  },

  listActiveTemplates() {
    return prisma.approvalFlowTemplate.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true },
    });
  },

  getTemplateWithSteps(templateId: string) {
    return prisma.approvalFlowTemplate.findUnique({
      where: { id: templateId },
      include: {
        steps: { include: { assignees: true }, orderBy: { orderIndex: 'asc' } },
      },
    });
  },
};
