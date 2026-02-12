import type { PrismaClient } from "@prisma/client";
import { searchPublicThreads } from "@/src/infra/repos/searchRepo";

export async function searchThreads(prisma: PrismaClient, q: string, page: number, pageSize: number) {
  return searchPublicThreads(prisma, q, page, pageSize);
}
