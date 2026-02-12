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

describe('US1 - Leave requests submit', () => {
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

    it('returns 422 when attachment is required but missing', async () => {
        const agent = await authAgent(app);
        const csrf = await login(agent, { email: seeded.employee.email, password: seeded.employee.password });

        const draft = await agent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', csrf)
            .send({
                leaveTypeId: seeded.leaveTypes.sick.id,
                startDate: '2026-02-03',
                endDate: '2026-02-03',
            })
            .expect(201);

        const res = await agent
            .post(`/me/leave-requests/${draft.body.id}/submit`)
            .set('X-CSRF-Token', csrf)
            .send({})
            .expect(422);

        expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('returns 409 when balance is insufficient', async () => {
        const agent = await authAgent(app);
        const csrf = await login(agent, { email: seeded.employee.email, password: seeded.employee.password });

        const draft = await agent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', csrf)
            .send({
                leaveTypeId: seeded.leaveTypes.annual.id,
                startDate: '2026-02-09',
                endDate: '2026-02-23',
            })
            .expect(201);

        const res = await agent
            .post(`/me/leave-requests/${draft.body.id}/submit`)
            .set('X-CSRF-Token', csrf)
            .send({})
            .expect(409);

        expect(res.body).toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });
});
