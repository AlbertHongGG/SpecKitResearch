import type { INestApplication } from '@nestjs/common';
import {
    authAgent,
    closeSeeded,
    createTestApp,
    createTestDatabaseUrl,
    login,
    migrateTestDb,
    seedTestData,
} from '../test-utils';

describe('US1 - Leave requests draft', () => {
    let app: INestApplication;
    let seeded: Awaited<ReturnType<typeof seedTestData>>;

    beforeAll(async () => {
        const { url } = await createTestDatabaseUrl();
        await migrateTestDb(url);
        seeded = await seedTestData(url);
        app = await createTestApp();
    });

    afterAll(async () => {
        await closeSeeded(seeded);
        await app.close();
    });

    it('creates a draft', async () => {
        const agent = await authAgent(app);
        const csrf = await login(agent, { email: seeded.employee.email, password: seeded.employee.password });

        const res = await agent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', csrf)
            .send({
                leaveTypeId: seeded.leaveTypes.annual.id,
                startDate: '2026-02-03',
                endDate: '2026-02-03',
                reason: 'test',
            })
            .expect(201);

        expect(res.body).toMatchObject({
            id: expect.any(String),
            status: 'draft',
            leaveType: { id: seeded.leaveTypes.annual.id },
            startDate: '2026-02-03',
            endDate: '2026-02-03',
        });
    });

    it('returns 409 for overlapping dates on create', async () => {
        const agent = await authAgent(app);
        const csrf = await login(agent, { email: seeded.employee.email, password: seeded.employee.password });

        await agent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', csrf)
            .send({
                leaveTypeId: seeded.leaveTypes.annual.id,
                startDate: '2026-02-05',
                endDate: '2026-02-05',
            })
            .expect(201);

        const conflict = await agent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', csrf)
            .send({
                leaveTypeId: seeded.leaveTypes.annual.id,
                startDate: '2026-02-05',
                endDate: '2026-02-05',
            })
            .expect(409);

        expect(conflict.body).toMatchObject({ code: 'DATE_OVERLAP' });
    });

    it('returns 409 for overlapping dates on update', async () => {
        const agent = await authAgent(app);
        const csrf = await login(agent, { email: seeded.employee.email, password: seeded.employee.password });

        const a = await agent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', csrf)
            .send({
                leaveTypeId: seeded.leaveTypes.annual.id,
                startDate: '2026-02-10',
                endDate: '2026-02-10',
            })
            .expect(201);

        const b = await agent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', csrf)
            .send({
                leaveTypeId: seeded.leaveTypes.annual.id,
                startDate: '2026-02-12',
                endDate: '2026-02-12',
            })
            .expect(201);

        const conflict = await agent
            .patch(`/me/leave-requests/${b.body.id}`)
            .set('X-CSRF-Token', csrf)
            .send({
                leaveTypeId: seeded.leaveTypes.annual.id,
                startDate: '2026-02-10',
                endDate: '2026-02-10',
            })
            .expect(409);

        expect(a.body.id).toBeDefined();
        expect(conflict.body).toMatchObject({ code: 'DATE_OVERLAP' });
    });
});
