import type request from 'supertest';
import type { PrismaClient, UserRole } from '@prisma/client';
import { extractCookie } from './test-app';

export async function registerUser(params: {
  http: ReturnType<typeof request>;
  prisma: PrismaClient;
  email: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}) {
  const { http, prisma, email, password, role, isActive } = params;

  await http.post('/auth/register').send({ email, password }).expect(201);
  const user = await prisma.user.findUnique({ where: { emailLower: email.toLowerCase() } });
  if (!user) throw new Error('User not created');

  if (role || typeof isActive === 'boolean') {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(role ? { role } : null),
        ...(typeof isActive === 'boolean' ? { isActive } : null),
      },
    });
  }

  return prisma.user.findUniqueOrThrow({ where: { id: user.id } });
}

export async function loginUser(params: {
  http: ReturnType<typeof request>;
  email: string;
  password: string;
}) {
  const { http, email, password } = params;
  const res = await http.post('/auth/login').send({ email, password }).expect(200);
  const cookie = extractCookie(res.headers['set-cookie']);
  if (!cookie) throw new Error('Missing Set-Cookie');
  return { cookie, body: res.body };
}
