import { PrismaClient, CategoryStatus, ProductStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUser(params: {
  email: string;
  password: string;
  roles: UserRole[];
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: { passwordHash },
    create: { email: params.email, passwordHash },
  });

  await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id } });
  await prisma.userRoleAssignment.createMany({
    data: params.roles.map((role) => ({ userId: user.id, role })),
  });

  return user;
}

async function main() {
  const admin = await upsertUser({
    email: 'admin@example.com',
    password: 'password',
    roles: [UserRole.ADMIN],
  });

  const seller = await upsertUser({
    email: 'seller@example.com',
    password: 'password',
    roles: [UserRole.SELLER],
  });

  const buyer = await upsertUser({
    email: 'buyer@example.com',
    password: 'password',
    roles: [UserRole.BUYER],
  });

  const categories = await prisma.category.findMany();
  const category =
    categories[0] ??
    (await prisma.category.create({
      data: { name: 'General', status: CategoryStatus.ACTIVE },
    }));

  const existingProducts = await prisma.product.findMany({ where: { sellerId: seller.id } });

  if (existingProducts.length === 0) {
    await prisma.product.createMany({
      data: [
        {
          sellerId: seller.id,
          categoryId: category.id,
          status: ProductStatus.ACTIVE,
          name: 'Sample Product A',
          description: 'A sample active product',
          priceCents: 1999,
          stock: 10,
        },
        {
          sellerId: seller.id,
          categoryId: category.id,
          status: ProductStatus.ACTIVE,
          name: 'Sample Product B',
          description: 'Another sample active product',
          priceCents: 4999,
          stock: 5,
        },
        {
          sellerId: seller.id,
          categoryId: category.id,
          status: ProductStatus.BANNED,
          name: 'Banned Product',
          description: 'Should not show in list/search, but direct URL shows unavailable',
          priceCents: 9999,
          stock: 1,
        },
      ],
    });
  }

  // Seed an example seller application for buyer
  await prisma.sellerApplication.upsert({
    where: { id: 'seed-seller-app-1' },
    update: {},
    create: {
      id: 'seed-seller-app-1',
      userId: buyer.id,
      shopName: 'Buyer Shop',
    },
  });

  console.log({ admin: admin.email, seller: seller.email, buyer: buyer.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
