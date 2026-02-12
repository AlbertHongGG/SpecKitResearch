import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAdmin } from "@/src/domain/policies/adminOnly";

export async function listUsers(
  prisma: PrismaClient,
  actor: Actor,
  input: { query?: string; page: number; pageSize: number },
) {
  requireAdmin(actor);

  const page = Math.max(1, input.page);
  const pageSize = Math.min(100, Math.max(1, input.pageSize));
  const q = input.query?.trim().toLowerCase();

  const where = q
    ? {
        OR: [
          { email: { contains: q } },
          { id: { contains: q } },
        ],
      }
    : {};

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, email: true, role: true, isBanned: true, createdAt: true },
    }),
  ]);

  return {
    users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    pageInfo: { page, pageSize, total },
  };
}
