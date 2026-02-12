import request from 'supertest';
import { createTestApp } from '../test-app';
import { prismaForTestDb, createUser } from '../test-factories';
import { AuditActions } from '../../src/audit/audit.actions';

describe('US2 admin seller application decision', () => {
  it('admin approves seller application -> writes AuditLog and adds seller role', async () => {
    const app = await createTestApp();
    const server = app.getHttpServer();
    const prisma = prismaForTestDb();

    const admin = await createUser(prisma, { email: `admin_${Date.now()}@example.com`, roles: ['admin'] });
    const buyer = await createUser(prisma, { email: `buyer_${Date.now()}@example.com`, roles: ['buyer'] });

    const buyerLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: buyer.email, password: 'password123' })
      .expect(201);
    const buyerCookie = buyerLogin.headers['set-cookie']?.[0];
    expect(buyerCookie).toContain('sid=');

    const created = await request(server)
      .post('/api/seller/apply')
      .set('Cookie', buyerCookie)
      .send({ shopName: 'My Shop' })
      .expect(201);

    const applicationId = created.body?.application?.id;
    expect(applicationId).toBeTruthy();

    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'password123' })
      .expect(201);
    const adminCookie = adminLogin.headers['set-cookie']?.[0];

    await request(server)
      .post(`/api/admin/seller-applications/${applicationId}/decision`)
      .set('Cookie', adminCookie)
      .send({ decision: 'approved', note: 'ok' })
      .expect(200);

    const updatedUser = await prisma.user.findUnique({ where: { id: buyer.id } });
    expect(updatedUser?.roles).toEqual(expect.arrayContaining(['seller']));

    const logs = await prisma.auditLog.findMany({ where: { targetType: 'SellerApplication', targetId: applicationId } });
    expect(logs.map((l) => l.action)).toContain(AuditActions.ADMIN_APPROVE_SELLER);

    await prisma.$disconnect();
    await app.close();
  });
});
