import { prisma } from '../db/prisma.js';

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },
  listByRole(role: 'User' | 'Reviewer' | 'Admin') {
    return prisma.user.findMany({ where: { role }, orderBy: { createdAt: 'asc' } });
  },
};
