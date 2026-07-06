import request from 'supertest';

import { ActivityStatus } from '@prisma/client';

import { createTestApp, resetDatabase, seedDatabase } from './test-app';

function isoPlusDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe('e2e: admin activities', () => {
  jest.setTimeout(20_000);

  test('create validates date > deadline; update validates capacity >= registeredCount', async () => {
    const { app, prisma } = await createTestApp();

    try {
      await resetDatabase(prisma);
      const seeded = await seedDatabase(prisma);

      const adminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeded.admin.email, password: seeded.admin.password })
        .expect(201);

      const adminCookie = adminLogin.headers['set-cookie']?.[0];
      expect(adminCookie).toBeTruthy();

      // invalid create: date <= deadline
      await request(app.getHttpServer())
        .post('/admin/activities')
        .set('Cookie', adminCookie)
        .send({
          title: '活動 X',
          description: '描述',
          date: isoPlusDays(2),
          deadline: isoPlusDays(2),
          location: '教室',
          capacity: 3,
        })
        .expect(400);

      // invalid create: capacity must be > 0
      await request(app.getHttpServer())
        .post('/admin/activities')
        .set('Cookie', adminCookie)
        .send({
          title: '活動 X2',
          description: '描述',
          date: isoPlusDays(5),
          deadline: isoPlusDays(4),
          location: '教室',
          capacity: 0,
        })
        .expect(400);

      const createRes = await request(app.getHttpServer())
        .post('/admin/activities')
        .set('Cookie', adminCookie)
        .send({
          title: '活動 Y',
          description: '描述 Y',
          date: isoPlusDays(5),
          deadline: isoPlusDays(4),
          location: '教室',
          capacity: 3,
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        id: expect.any(String),
        title: '活動 Y',
        location: '教室',
        status: 'DRAFT',
        registeredCount: 0,
        capacity: 3,
      });

      // Create an activity with registeredCount > 0 to test update constraint
      const admin = await prisma.user.findUnique({ where: { email: seeded.admin.email } });
      expect(admin).toBeTruthy();

      const seededActivity = await prisma.activity.create({
        data: {
          title: '活動 Z',
          description: '描述 Z',
          date: new Date(isoPlusDays(10)),
          deadline: new Date(isoPlusDays(9)),
          location: '社辦',
          capacity: 5,
          status: ActivityStatus.PUBLISHED,
          registeredCount: 2,
          createdByUserId: admin!.id,
        },
      });

      // invalid update: capacity < registeredCount (2)
      await request(app.getHttpServer())
        .put(`/admin/activities/${seededActivity.id}`)
        .set('Cookie', adminCookie)
        .send({
          title: '活動 Z2',
          description: '描述 Z2',
          date: isoPlusDays(10),
          deadline: isoPlusDays(9),
          location: '社辦',
          capacity: 1,
        })
        .expect(400);

      // invalid update: capacity must be > 0
      await request(app.getHttpServer())
        .put(`/admin/activities/${seededActivity.id}`)
        .set('Cookie', adminCookie)
        .send({
          title: '活動 Z2',
          description: '描述 Z2',
          date: isoPlusDays(10),
          deadline: isoPlusDays(9),
          location: '社辦',
          capacity: 0,
        })
        .expect(400);

      // valid update
      const updateRes = await request(app.getHttpServer())
        .put(`/admin/activities/${seededActivity.id}`)
        .set('Cookie', adminCookie)
        .send({
          title: '活動 Z2',
          description: '描述 Z2',
          date: isoPlusDays(10),
          deadline: isoPlusDays(9),
          location: '社辦',
          capacity: 3,
        })
        .expect(200);

      expect(updateRes.body).toMatchObject({
        id: seededActivity.id,
        title: '活動 Z2',
        capacity: 3,
        registeredCount: 2,
      });
    } finally {
      await app.close();
    }
  });
});
