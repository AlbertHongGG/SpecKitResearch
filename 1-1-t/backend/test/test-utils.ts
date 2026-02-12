import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { hashPassword } from '../src/auth/password';

type PrismaLike = {
  user: {
    create: (args: any) => Promise<any>;
  };
};

export async function registerUser(
  app: INestApplication,
  input: { email: string; name: string; password: string },
) {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send(input);
  return res;
}

export async function createUserWithRole(
  prisma: PrismaLike,
  input: { email: string; name: string; password: string; role: Role },
) {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
  });
}

export async function loginUser(
  app: INestApplication,
  input: { email: string; password: string },
) {
  const res = await request(app.getHttpServer()).post('/auth/login').send(input);
  return res;
}

export async function registerAndLogin(
  app: INestApplication,
  input: { email: string; name: string; password: string },
) {
  await registerUser(app, input);
  const loginRes = await loginUser(app, {
    email: input.email,
    password: input.password,
  });

  return loginRes;
}
