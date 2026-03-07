import { prisma } from '../src/lib/server/db';
import { hashPassword } from '../src/lib/server/password';

const DEFAULT_CATEGORIES: Array<{ name: string; type: 'income' | 'expense' | 'both'; isDefault: boolean }> = [
  { name: '食物', type: 'expense', isDefault: true },
  { name: '生活', type: 'expense', isDefault: true },
  { name: '交通', type: 'expense', isDefault: true },
  { name: '薪水', type: 'income', isDefault: true },
  { name: '提款', type: 'income', isDefault: true },
];

const EXTRA_CATEGORIES: Array<{ name: string; type: 'income' | 'expense' | 'both' }> = [
  { name: '娛樂', type: 'expense' },
  { name: '醫療', type: 'expense' },
  { name: '獎金', type: 'income' },
  { name: '投資', type: 'income' },
];

function toDateKey(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toUtcDateFromDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function getCurrentMonthDate(day: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 0, 0, 0, 0));
}

function getPrevMonthDate(day: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day, 0, 0, 0, 0));
}

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

async function ensureExtraCategoriesForUser(userId: string) {
  for (const category of EXTRA_CATEGORIES) {
    await prisma.category.upsert({
      where: {
        userId_name: {
          userId,
          name: category.name,
        },
      },
      update: {
        type: category.type,
        isActive: true,
      },
      create: {
        userId,
        name: category.name,
        type: category.type,
        isDefault: false,
        isActive: true,
      },
    });
  }
}

async function ensureSampleTransactionsForUser(userId: string) {
  const resetSeed = process.env.DEMO_RESET_TRANSACTIONS === '1';
  if (resetSeed) {
    await prisma.transaction.deleteMany({ where: { userId } });
  }

  const existingTxCount = await prisma.transaction.count({ where: { userId } });
  if (existingTxCount > 0) return;

  const categories = await prisma.category.findMany({ where: { userId, isActive: true } });
  const categoryMap = new Map(categories.map((category) => [category.name, category.id]));

  const requiredNames = ['薪水', '獎金', '提款', '食物', '生活', '交通', '娛樂', '醫療'];
  for (const name of requiredNames) {
    if (!categoryMap.has(name)) {
      throw new Error(`Missing category for seed transaction: ${name}`);
    }
  }

  const txRows: Array<{ type: 'income' | 'expense'; amount: number; dateKey: string; categoryName: string; note: string }> = [
    { type: 'income', amount: 65000, dateKey: toDateKey(getCurrentMonthDate(1)), categoryName: '薪水', note: '月薪入帳' },
    { type: 'expense', amount: 120, dateKey: toDateKey(getCurrentMonthDate(2)), categoryName: '交通', note: '捷運' },
    { type: 'expense', amount: 320, dateKey: toDateKey(getCurrentMonthDate(2)), categoryName: '食物', note: '午餐' },
    { type: 'expense', amount: 1800, dateKey: toDateKey(getCurrentMonthDate(3)), categoryName: '生活', note: '日用品補貨' },
    { type: 'expense', amount: 450, dateKey: toDateKey(getCurrentMonthDate(4)), categoryName: '食物', note: '晚餐聚餐' },
    { type: 'expense', amount: 780, dateKey: toDateKey(getCurrentMonthDate(5)), categoryName: '交通', note: '高鐵' },
    { type: 'expense', amount: 600, dateKey: toDateKey(getCurrentMonthDate(6)), categoryName: '娛樂', note: '電影與點心' },
    { type: 'income', amount: 5000, dateKey: toDateKey(getCurrentMonthDate(7)), categoryName: '獎金', note: '專案獎金' },
    { type: 'expense', amount: 950, dateKey: toDateKey(getCurrentMonthDate(8)), categoryName: '醫療', note: '診所與藥費' },
    { type: 'expense', amount: 260, dateKey: toDateKey(getCurrentMonthDate(9)), categoryName: '食物', note: '早餐 + 咖啡' },
    { type: 'expense', amount: 2200, dateKey: toDateKey(getCurrentMonthDate(10)), categoryName: '生活', note: '家用採買' },
    { type: 'income', amount: 15000, dateKey: toDateKey(getCurrentMonthDate(12)), categoryName: '提款', note: 'ATM 提款' },
    { type: 'income', amount: 65000, dateKey: toDateKey(getPrevMonthDate(1)), categoryName: '薪水', note: '上月月薪入帳' },
    { type: 'expense', amount: 330, dateKey: toDateKey(getPrevMonthDate(3)), categoryName: '食物', note: '上月午餐' },
    { type: 'expense', amount: 900, dateKey: toDateKey(getPrevMonthDate(5)), categoryName: '交通', note: '上月通勤補卡' },
    { type: 'expense', amount: 1280, dateKey: toDateKey(getPrevMonthDate(8)), categoryName: '娛樂', note: '上月 KTV' },
    { type: 'expense', amount: 680, dateKey: toDateKey(getPrevMonthDate(12)), categoryName: '醫療', note: '上月健檢掛號' },
    { type: 'income', amount: 4000, dateKey: toDateKey(getPrevMonthDate(15)), categoryName: '獎金', note: '上月績效獎金' },
    { type: 'expense', amount: 2100, dateKey: toDateKey(getPrevMonthDate(18)), categoryName: '生活', note: '上月家電耗材' },
  ];

  await prisma.transaction.createMany({
    data: txRows.map((row) => ({
      userId,
      categoryId: categoryMap.get(row.categoryName) as string,
      type: row.type,
      amount: row.amount,
      dateKey: row.dateKey,
      date: toUtcDateFromDateKey(row.dateKey),
      note: row.note,
    })),
  });
}

async function main() {
  // Optional demo user for local dev
  const email = process.env.DEMO_EMAIL ?? 'member@example.com';
  const password = process.env.DEMO_PASSWORD ?? 'password1234';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await hashPassword(password),
    },
  });

  await ensureDefaultsForUser(user.id);
  await ensureExtraCategoriesForUser(user.id);
  await ensureSampleTransactionsForUser(user.id);
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
