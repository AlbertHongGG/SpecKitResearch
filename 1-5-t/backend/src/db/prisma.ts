import { PrismaClient } from '@prisma/client';

export let prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export function setPrismaClientForTests(next: PrismaClient) {
  prisma = next;
}
