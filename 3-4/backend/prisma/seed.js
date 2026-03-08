import { PrismaClient, Role, SimulationScenario, ReturnMethod } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
const prisma = new PrismaClient();
async function main() {
    const adminEmail = 'admin@example.com';
    const userEmail = 'user@example.com';
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            passwordHash: await hashPassword('admin1234'),
            role: Role.ADMIN,
        },
    });
    await prisma.user.upsert({
        where: { email: userEmail },
        update: {},
        create: {
            email: userEmail,
            passwordHash: await hashPassword('user1234'),
            role: Role.USER,
        },
    });
    await prisma.systemSettings.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            allowedCurrencies: ['TWD', 'USD', 'JPY'],
            defaultReturnMethod: ReturnMethod.query_string,
            sessionIdleSec: 60 * 60 * 8,
            sessionAbsoluteSec: 60 * 60 * 24 * 7,
            webhookSecretGraceSecDefault: 60 * 60 * 24 * 7,
        },
    });
    await prisma.paymentMethod.upsert({
        where: { code: 'CREDIT_CARD_SIM' },
        update: {
            enabled: true,
            displayName: '信用卡（模擬）',
            sortOrder: 1,
        },
        create: {
            code: 'CREDIT_CARD_SIM',
            displayName: '信用卡（模擬）',
            enabled: true,
            sortOrder: 1,
        },
    });
    const scenarios = [
        { scenario: SimulationScenario.success, enabled: true, delay: 0 },
        { scenario: SimulationScenario.failed, enabled: true, delay: 0, errorCode: 'CARD_DECLINED', errorMessage: '卡片被拒' },
        { scenario: SimulationScenario.cancelled, enabled: true, delay: 0 },
        { scenario: SimulationScenario.timeout, enabled: true, delay: 0, errorCode: 'TIMEOUT', errorMessage: '逾時' },
        { scenario: SimulationScenario.delayed_success, enabled: true, delay: 5 },
    ];
    for (const s of scenarios) {
        await prisma.simulationScenarioTemplate.upsert({
            where: { scenario: s.scenario },
            update: {
                enabled: s.enabled,
                defaultDelaySec: s.delay,
                defaultErrorCode: s.errorCode ?? null,
                defaultErrorMessage: s.errorMessage ?? null,
            },
            create: {
                scenario: s.scenario,
                enabled: s.enabled,
                defaultDelaySec: s.delay,
                defaultErrorCode: s.errorCode ?? null,
                defaultErrorMessage: s.errorMessage ?? null,
            },
        });
    }
    // eslint-disable-next-line no-console
    console.log('Seeded:', { adminId: admin.id });
}
main()
    .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
