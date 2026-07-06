import request from 'supertest';

import { AuditAction } from '@prisma/client';

import { createTestApp, resetDatabase, seedDatabase } from './test-app';

describe('e2e: admin registrations + export', () => {
  jest.setTimeout(20_000);

  test('admin can list registrations and export CSV with UTF-8 BOM', async () => {
    const { app, prisma } = await createTestApp();

    try {
      await resetDatabase(prisma);
      const seeded = await seedDatabase(prisma);

      // Member registers for a published activity.
      const memberLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeded.member.email, password: seeded.member.password })
        .expect(201);

      const memberCookie = memberLogin.headers['set-cookie']?.[0];
      expect(memberCookie).toBeTruthy();

      const activity = await prisma.activity.findFirst({ where: { status: 'PUBLISHED' } });
      expect(activity).toBeTruthy();

      await request(app.getHttpServer())
        .post(`/activities/${activity!.id}/registrations`)
        .send({ idempotencyKey: 'reg-export-1' })
        .set('Cookie', memberCookie)
        .expect(201);

      // Admin lists registrations.
      const adminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeded.admin.email, password: seeded.admin.password })
        .expect(201);

      const adminCookie = adminLogin.headers['set-cookie']?.[0];
      expect(adminCookie).toBeTruthy();

      const listRes = await request(app.getHttpServer())
        .get(`/admin/activities/${activity!.id}/registrations`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(listRes.body).toMatchObject({
        items: [
          {
            name: 'Member',
            email: seeded.member.email,
            registeredAt: expect.any(String),
          },
        ],
      });

      // Export CSV must include UTF-8 BOM and correct header.
      const export1 = await request(app.getHttpServer())
        .post(`/admin/activities/${activity!.id}/registrations/export`)
        .set('Cookie', adminCookie)
        .send({ idempotencyKey: 'exp-1' })
        .expect(200);

      expect(export1.headers['content-type']).toContain('text/csv');

      const csv1 = export1.text;
      expect(csv1.startsWith('\uFEFF')).toBe(true);
      expect(csv1).toContain('姓名,Email,報名時間');
      expect(csv1).toContain(`Member,${seeded.member.email}`);

      // Re-export with same idempotencyKey should not create additional audit logs.
      const export2 = await request(app.getHttpServer())
        .post(`/admin/activities/${activity!.id}/registrations/export`)
        .set('Cookie', adminCookie)
        .send({ idempotencyKey: 'exp-1' })
        .expect(200);

      expect(export2.text).toBe(csv1);

      const auditLogs = await prisma.auditLog.findMany({
        where: { action: AuditAction.REGISTRATIONS_EXPORT, targetId: activity!.id },
      });
      expect(auditLogs).toHaveLength(1);
    } finally {
      await app.close();
    }
  });
});
