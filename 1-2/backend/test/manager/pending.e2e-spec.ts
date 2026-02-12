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

describe('US2 - Manager pending list', () => {
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

    it('returns 403 for non-manager user', async () => {
        const agent = await authAgent(app);
        const csrf = await login(agent, { email: seeded.employee.email, password: seeded.employee.password });

        await agent
            .get('/manager/pending-leave-requests')
            .set('X-CSRF-Token', csrf)
            .expect(403);
    });

    it('returns only managed employees', async () => {
        // create a submitted request for managed employee
        const employeeAgent = await authAgent(app);
        const employeeCsrf = await login(employeeAgent, { email: seeded.employee.email, password: seeded.employee.password });

        const lr1 = await employeeAgent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', employeeCsrf)
            .send({ leaveTypeId: seeded.leaveTypes.annual.id, startDate: '2026-02-03', endDate: '2026-02-03' })
            .expect(201);

        await employeeAgent
            .post(`/me/leave-requests/${lr1.body.id}/submit`)
            .set('X-CSRF-Token', employeeCsrf)
            .send({})
            .expect(200);

        // create a submitted request for HR (not managed)
        const hrAgent = await authAgent(app);
        const hrCsrf = await login(hrAgent, { email: seeded.hr.email, password: seeded.hr.password });

        const lr2 = await hrAgent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', hrCsrf)
            .send({ leaveTypeId: seeded.leaveTypes.annual.id, startDate: '2026-02-05', endDate: '2026-02-05' })
            .expect(201);

        await hrAgent
            .post(`/me/leave-requests/${lr2.body.id}/submit`)
            .set('X-CSRF-Token', hrCsrf)
            .send({})
            .expect(200);

        const managerAgent = await authAgent(app);
        const managerCsrf = await login(managerAgent, { email: seeded.manager.email, password: seeded.manager.password });

        const res = await managerAgent
            .get('/manager/pending-leave-requests')
            .set('X-CSRF-Token', managerCsrf)
            .expect(200);

        const ids = (res.body.items as any[]).map((x) => x.id);
        expect(ids).toContain(lr1.body.id);
        expect(ids).not.toContain(lr2.body.id);
    });
});
