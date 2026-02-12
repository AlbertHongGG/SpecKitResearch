import request from 'supertest';
import { createTestApp } from '../test-app';
import { PrismaClient } from '@prisma/client';

describe('RBAC + ownership basics', () => {
  it('buyer cannot access admin endpoint (403), admin can (200)', async () => {
    const app = await createTestApp();
    const server = app.getHttpServer();

    const buyerEmail = `b${Date.now()}@example.com`;
    await request(server).post('/api/auth/signup').send({ email: buyerEmail, password: 'password123' }).expect(201);
    const buyerLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: buyerEmail, password: 'password123' })
      .expect(201);
    const buyerCookie = buyerLogin.headers['set-cookie']?.[0];
    expect(buyerCookie).toContain('sid=');

    await request(server).get('/api/debug/admin').set('Cookie', buyerCookie).expect(403);

    const prisma = new PrismaClient({
      datasources: { db: { url: 'file:./test.db?connection_limit=1&socket_timeout=30' } },
    });
    const adminEmail = `a${Date.now()}@example.com`;
    await request(server).post('/api/auth/signup').send({ email: adminEmail, password: 'password123' }).expect(201);
    await prisma.user.update({ where: { email: adminEmail }, data: { roles: ['admin'] as any } });

    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'password123' })
      .expect(201);
    const adminCookie = adminLogin.headers['set-cookie']?.[0];
    expect(adminCookie).toContain('sid=');

    await request(server).get('/api/debug/admin').set('Cookie', adminCookie).expect(200);
    await prisma.$disconnect();
    await app.close();
  });

  it('ownership denies mismatched buyerId', async () => {
    const app = await createTestApp();
    const server = app.getHttpServer();

    const email = `o${Date.now()}@example.com`;
    await request(server).post('/api/auth/signup').send({ email, password: 'password123' }).expect(201);
    const login = await request(server).post('/api/auth/login').send({ email, password: 'password123' }).expect(201);
    const cookie = login.headers['set-cookie']?.[0];

    await request(server).get('/api/debug/buyer/someone-else').set('Cookie', cookie).expect(403);
    await app.close();
  });
});
