import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const MEMBER_EMAIL = 'member@example.com';
const MEMBER_PASSWORD = 'password1234';

const DEFAULT_CATEGORIES: Array<{ name: string; type: 'income' | 'expense' }> = [
  { name: '食物', type: 'expense' },
  { name: '生活', type: 'expense' },
  { name: '交通', type: 'expense' },
  { name: '薪水', type: 'income' },
  { name: '提款', type: 'income' },
];

const SEED_TRANSACTIONS: Array<{
  type: 'income' | 'expense';
  categoryName: string;
  amount: number;
  date: string;
  note?: string;
}> = [
  { type: 'income', categoryName: '薪水', amount: 60000, date: '2026-02-01', note: '二月薪資' },
  { type: 'expense', categoryName: '食物', amount: 180, date: '2026-02-03', note: '早餐' },
  { type: 'expense', categoryName: '交通', amount: 120, date: '2026-02-03', note: '捷運儲值' },
  { type: 'expense', categoryName: '生活', amount: 890, date: '2026-02-07', note: '日用品' },
  { type: 'expense', categoryName: '食物', amount: 260, date: '2026-02-10', note: '午餐聚會' },
  { type: 'income', categoryName: '提款', amount: 3000, date: '2026-02-11', note: 'ATM 提款' },
  { type: 'expense', categoryName: '交通', amount: 75, date: '2026-02-12', note: '公車' },
  { type: 'expense', categoryName: '食物', amount: 420, date: '2026-02-15', note: '晚餐' },
  { type: 'expense', categoryName: '生活', amount: 520, date: '2026-02-18', note: '藥妝' },
  { type: 'expense', categoryName: '食物', amount: 150, date: '2026-02-22', note: '咖啡' },
];

async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
}

async function main() {
  const passwordHash = await hashPassword(MEMBER_PASSWORD);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: MEMBER_EMAIL },
      update: { passwordHash },
      create: {
        email: MEMBER_EMAIL,
        passwordHash,
      },
      select: { id: true, email: true },
    });

    for (const category of DEFAULT_CATEGORIES) {
      await tx.category.upsert({
        where: {
          userId_name: {
            userId: user.id,
            name: category.name,
          },
        },
        update: {
          type: category.type,
          isActive: true,
          isDefault: true,
        },
        create: {
          userId: user.id,
          name: category.name,
          type: category.type,
          isActive: true,
          isDefault: true,
        },
      });
    }

    const categories = await tx.category.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
    });
    const categoryIdByName = new Map(categories.map((category) => [category.name, category.id] as const));

    await tx.transaction.deleteMany({
      where: { userId: user.id },
    });

    await tx.transaction.createMany({
      data: SEED_TRANSACTIONS.map((item) => {
        const categoryId = categoryIdByName.get(item.categoryName);
        if (!categoryId) {
          throw new Error(`Missing category for seed transaction: ${item.categoryName}`);
        }

        return {
          userId: user.id,
          categoryId,
          type: item.type,
          amount: item.amount,
          date: new Date(`${item.date}T00:00:00.000Z`),
          note: item.note,
        };
      }),
    });

    return { userEmail: user.email, transactionCount: SEED_TRANSACTIONS.length };
  });

  console.log('Seed completed.');
  console.log(`member email: ${result.userEmail}`);
  console.log(`member password: ${MEMBER_PASSWORD}`);
  console.log(`transactions inserted: ${result.transactionCount}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
