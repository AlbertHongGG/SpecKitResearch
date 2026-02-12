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

describe('US2 - Manager reject', () => {
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

    it('requires rejectionReason (422)', async () => {
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

        const res = await managerAgent
            .post(`/manager/leave-requests/${draft.body.id}/reject`)
            .set('X-CSRF-Token', managerCsrf)
            .send({ rejectionReason: '' })
            .expect(422);

        expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('releases reserved days on reject', async () => {
        const employeeAgent = await authAgent(app);
        const employeeCsrf = await login(employeeAgent, { email: seeded.employee.email, password: seeded.employee.password });

        const draft = await employeeAgent
            .post('/me/leave-requests')
            .set('X-CSRF-Token', employeeCsrf)
            .send({ leaveTypeId: seeded.leaveTypes.annual.id, startDate: '2026-02-10', endDate: '2026-02-10' })
            .expect(201);

        await employeeAgent
            .post(`/me/leave-requests/${draft.body.id}/submit`)
            .set('X-CSRF-Token', employeeCsrf)
            .send({})
            .expect(200);

        const before = await seeded.prisma.leaveBalance.findUniqueOrThrow({
            where: { userId_leaveTypeId_year: { userId: seeded.employee.id, leaveTypeId: seeded.leaveTypes.annual.id, year: seeded.year } },
        });
        expect(before.reservedDays).toBeGreaterThan(0);

        const managerAgent = await authAgent(app);
        const managerCsrf = await login(managerAgent, { email: seeded.manager.email, password: seeded.manager.password });

        await managerAgent
            .post(`/manager/leave-requests/${draft.body.id}/reject`)
            .set('X-CSRF-Token', managerCsrf)
            .send({ rejectionReason: 'nope' })
            .expect(200);

        const after = await seeded.prisma.leaveBalance.findUniqueOrThrow({
            where: { userId_leaveTypeId_year: { userId: seeded.employee.id, leaveTypeId: seeded.leaveTypes.annual.id, year: seeded.year } },
        });

        expect(after.reservedDays).toBeLessThan(before.reservedDays);
    });
});
