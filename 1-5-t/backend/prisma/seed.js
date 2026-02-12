import { prisma } from '../src/db/prisma';
import { hashPassword } from '../src/auth/password';
async function main() {
    const passwordHash = await hashPassword('password');
    const DEFAULT_TEMPLATE_ID = '00000000-0000-0000-0000-000000000001';
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: { passwordHash, role: 'Admin' },
        create: { email: 'admin@example.com', passwordHash, role: 'Admin' },
    });
    const user = await prisma.user.upsert({
        where: { email: 'user@example.com' },
        update: { passwordHash, role: 'User' },
        create: { email: 'user@example.com', passwordHash, role: 'User' },
    });
    const reviewer1 = await prisma.user.upsert({
        where: { email: 'reviewer1@example.com' },
        update: { passwordHash, role: 'Reviewer' },
        create: { email: 'reviewer1@example.com', passwordHash, role: 'Reviewer' },
    });
    const reviewer2 = await prisma.user.upsert({
        where: { email: 'reviewer2@example.com' },
        update: { passwordHash, role: 'Reviewer' },
        create: { email: 'reviewer2@example.com', passwordHash, role: 'Reviewer' },
    });
    // Default active template
    const template = await prisma.approvalFlowTemplate.upsert({
        where: { id: DEFAULT_TEMPLATE_ID },
        update: { isActive: true, name: '預設流程' },
        create: { id: DEFAULT_TEMPLATE_ID, isActive: true, name: '預設流程' },
    });
    // Recreate steps/assignees for idempotent seed
    await prisma.approvalFlowStepAssignee.deleteMany({
        where: { step: { templateId: template.id } },
    });
    await prisma.approvalFlowStep.deleteMany({ where: { templateId: template.id } });
    const step1 = await prisma.approvalFlowStep.create({
        data: {
            templateId: template.id,
            stepKey: 'S1',
            orderIndex: 0,
            mode: 'Parallel',
        },
    });
    const step2 = await prisma.approvalFlowStep.create({
        data: {
            templateId: template.id,
            stepKey: 'S2',
            orderIndex: 1,
            mode: 'Serial',
        },
    });
    await prisma.approvalFlowStepAssignee.createMany({
        data: [
            { stepId: step1.id, assigneeId: reviewer1.id },
            { stepId: step1.id, assigneeId: reviewer2.id },
            { stepId: step2.id, assigneeId: reviewer1.id },
        ],
    });
    console.log('Seeded users:', { admin: admin.email, user: user.email, reviewer1: reviewer1.email, reviewer2: reviewer2.email });
    console.log('Seeded template:', { id: template.id, name: template.name });
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map