import bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser(params: { email: string; password: string; role: UserRole }) {
  const passwordHash = await bcrypt.hash(params.password, 12);
  return prisma.user.upsert({
    where: { email: params.email.toLowerCase() },
    update: {
      role: params.role,
      isActive: true,
      passwordHash,
    },
    create: {
      email: params.email.toLowerCase(),
      passwordHash,
      role: params.role,
      isActive: true,
    },
  });
}

async function main() {
  await upsertUser({ email: 'admin@example.com', password: 'AdminPass123', role: UserRole.ADMIN });
  await upsertUser({ email: 'agent@example.com', password: 'AgentPass123', role: UserRole.AGENT });
  await upsertUser({ email: 'customer@example.com', password: 'CustomerPass123', role: UserRole.CUSTOMER });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
