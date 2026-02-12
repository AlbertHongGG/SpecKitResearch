import { prisma } from '../src/lib/server/db';
import { hashPassword } from '../src/lib/server/password';

const DEFAULT_CATEGORIES: Array<{ name: string; type: 'income' | 'expense' | 'both'; isDefault: boolean }> = [
  { name: '食物', type: 'expense', isDefault: true },
  { name: '生活', type: 'expense', isDefault: true },
  { name: '交通', type: 'expense', isDefault: true },
  { name: '薪水', type: 'income', isDefault: true },
  { name: '提款', type: 'income', isDefault: true },
];

async function ensureDefaultsForUser(userId: string) {
  const existing = await prisma.category.count({ where: { userId } });
  if (existing > 0) return;

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      userId,
      name: c.name,
      type: c.type,
      isDefault: c.isDefault,
      isActive: true,
    })),
  });
}

async function main() {
  // Optional demo user for local dev
  const email = process.env.DEMO_EMAIL ?? 'demo@example.com';
  const password = process.env.DEMO_PASSWORD ?? 'password123';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await hashPassword(password),
    },
  });

  await ensureDefaultsForUser(user.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
