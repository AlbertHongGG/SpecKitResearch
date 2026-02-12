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

describe('US2 - Manager approve', () => {
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

    it('approves submitted request; second approve is 409', async () => {
        const employeeAgent = await authAgent(app);
        const employeeCsrf = await login(employeeAgent, { email: seeded.employee.email, password: seeded.employee.password });

        const draft = await employeeAgent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', employeeCsrf)
            .send({ leaveTypeId: seeded.leaveTypes.annual.id, startDate: '2026-02-03', endDate: '2026-02-03' })
            .expect(201);

        await employeeAgent
            .post(`/me/leave-requests/${draft.body.id}/submit`)
            .set('X-CSRF-Token', employeeCsrf)
            .send({})
            .expect(200);

        const managerAgent = await authAgent(app);
        const managerCsrf = await login(managerAgent, { email: seeded.manager.email, password: seeded.manager.password });

        const approved = await managerAgent
            .post(`/manager/leave-requests/${draft.body.id}/approve`)
            .set('X-CSRF-Token', managerCsrf)
            .send({})
            .expect(200);

        expect(approved.body).toMatchObject({ id: draft.body.id, status: 'approved' });

        const conflict = await managerAgent
            .post(`/manager/leave-requests/${draft.body.id}/approve`)
            .set('X-CSRF-Token', managerCsrf)
            .send({})
            .expect(409);

        expect(conflict.body).toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
    });
});
