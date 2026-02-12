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

describe('US3 - Manager calendar', () => {
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

    it('returns only approved by default; includes submitted when includeSubmitted=true', async () => {
        const employeeAgent = await authAgent(app);
        const employeeCsrf = await login(employeeAgent, { email: seeded.employee.email, password: seeded.employee.password });

        const submittedDraft = await employeeAgent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', employeeCsrf)
            .send({ leaveTypeId: seeded.leaveTypes.annual.id, startDate: '2026-02-03', endDate: '2026-02-03' })
            .expect(201);

        await employeeAgent
            .post(`/me/leave-requests/${submittedDraft.body.id}/submit`)
            .set('X-CSRF-Token', employeeCsrf)
            .send({})
            .expect(200);

        const approvedDraft = await employeeAgent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', employeeCsrf)
            .send({ leaveTypeId: seeded.leaveTypes.annual.id, startDate: '2026-02-10', endDate: '2026-02-10' })
            .expect(201);

        await employeeAgent
            .post(`/me/leave-requests/${approvedDraft.body.id}/submit`)
            .set('X-CSRF-Token', employeeCsrf)
            .send({})
            .expect(200);

        const managerAgent = await authAgent(app);
        const managerCsrf = await login(managerAgent, { email: seeded.manager.email, password: seeded.manager.password });

        await managerAgent
            .post(`/manager/leave-requests/${approvedDraft.body.id}/approve`)
            .set('X-CSRF-Token', managerCsrf)
            .send({})
            .expect(200);

        const baseUrl = '/manager/calendar?view=month&start=2026-02-01&end=2026-03-01';

        const res1 = await managerAgent.get(baseUrl).expect(200);
        const ids1 = (res1.body.items as any[]).map((e) => e.leaveRequestId);
        expect(ids1).toContain(approvedDraft.body.id);
        expect(ids1).not.toContain(submittedDraft.body.id);

        const res2 = await managerAgent.get(`${baseUrl}&includeSubmitted=true`).expect(200);
        const ids2 = (res2.body.items as any[]).map((e) => e.leaveRequestId);
        expect(ids2).toContain(approvedDraft.body.id);
        expect(ids2).toContain(submittedDraft.body.id);
    });
});
