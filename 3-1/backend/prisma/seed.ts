import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function upsertUser(email: string, password: string, roles: string[]) {
  const passwordHash = await argon2.hash(password);
  return prisma.user.upsert({
    where: { email },
    update: { roles, passwordHash },
    create: { email, roles, passwordHash },
  });
}

async function main() {
  const admin = await upsertUser('admin@example.com', 'password123', ['admin']);
  const buyer = await upsertUser('buyer@example.com', 'password123', ['buyer']);
  const seller1 = await upsertUser('seller1@example.com', 'password123', ['seller']);
  const seller2 = await upsertUser('seller2@example.com', 'password123', ['seller']);

  const cat1 = await prisma.category.upsert({
    where: { name: 'Electronics' },
    update: { status: 'active' },
    create: { name: 'Electronics', status: 'active' },
  });
  const cat2 = await prisma.category.upsert({
    where: { name: 'Books' },
    update: { status: 'active' },
    create: { name: 'Books', status: 'active' },
  });

  await prisma.product.createMany({
    data: [
      {
        sellerId: seller1.id,
        title: 'USB-C Cable',
        description: 'Durable 1m USB-C cable',
        price: 19900,
        stock: 100,
        categoryId: cat1.id,
        status: 'active',
      },
      {
        sellerId: seller2.id,
        title: 'Notebook',
        description: 'Plain notebook',
        price: 9900,
        stock: 50,
        categoryId: cat2.id,
        status: 'active',
      },
    ],
  });

  // Ensure buyer cart exists
  await prisma.cart.upsert({
    where: { buyerId: buyer.id },
    update: {},
    create: { buyerId: buyer.id },
  });

  // eslint-disable-next-line no-console
  console.log('Seeded:', { admin: admin.email, buyer: buyer.email, seller1: seller1.email, seller2: seller2.email });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
