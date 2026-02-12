import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@example.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await hashPassword('admin1234');
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, role: 'admin', isActive: true },
    });
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
