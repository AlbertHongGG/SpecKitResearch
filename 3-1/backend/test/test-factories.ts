import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

export function prismaForTestDb() {
  return new PrismaClient({
    datasources: { db: { url: 'file:./test.db?connection_limit=1&socket_timeout=30' } },
  });
}

export async function createUser(
  prisma: PrismaClient,
  params: { email: string; password?: string; roles?: string[] },
) {
  const password = params.password ?? 'password123';
  const passwordHash = await argon2.hash(password);
  return prisma.user.create({
    data: {
      email: params.email,
      passwordHash,
      roles: params.roles ?? ['buyer'],
    },
  });
}

export async function createCategory(prisma: PrismaClient, name: string) {
  return prisma.category.create({ data: { name, status: 'active' } });
}

export async function createProduct(
  prisma: PrismaClient,
  params: {
    sellerId: string;
    categoryId: string;
    title: string;
    price: number;
    stock: number;
    status?: string;
  },
) {
  return prisma.product.create({
    data: {
      sellerId: params.sellerId,
      categoryId: params.categoryId,
      title: params.title,
      description: params.title,
      price: params.price,
      stock: params.stock,
      status: params.status ?? 'active',
    },
  });
}
