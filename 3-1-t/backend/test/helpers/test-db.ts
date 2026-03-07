import { execSync } from 'node:child_process';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';

const prismaSchemaPath = path.resolve(
  __dirname,
  '../../../prisma/schema.prisma',
);
const defaultDbPath = path.resolve(__dirname, '../../.tmp/test.db');

export function getTestDatabaseUrl(dbPath = defaultDbPath) {
  return `file:${dbPath.replace(/\\/g, '/')}`;
}

export function runPrismaMigrateAndSeed(databaseUrl = getTestDatabaseUrl()) {
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
  };

  execSync(
    `npx prisma db push --schema "${prismaSchemaPath}" --skip-generate`,
    {
      stdio: 'inherit',
      env,
    },
  );
  execSync('npm run prisma:seed', {
    stdio: 'inherit',
    env,
    cwd: path.resolve(__dirname, '../../..'),
  });
}

export async function cleanTestDatabase(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.disputeCase.deleteMany(),
    prisma.settlement.deleteMany(),
    prisma.sellerApplication.deleteMany(),
    prisma.review.deleteMany(),
    prisma.refundRequest.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.subOrderItem.deleteMany(),
    prisma.subOrder.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function createTestPrismaClient(
  databaseUrl = getTestDatabaseUrl(),
) {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });
  await prisma.$connect();
  return prisma;
}

export async function disconnectTestPrisma(prisma: PrismaClient) {
  await prisma.$disconnect();
}
