import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Intentionally minimal.
  // Categories are seeded per-user during registration (US1), because Category is user-scoped.
  // This seed script is kept for local/dev experiments and future extensions.
  console.log('Seed: no-op (categories are seeded per-user on register).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
