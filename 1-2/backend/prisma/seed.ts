import { PrismaClient, UserRole, type LeaveType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const year = 2026;

    const engineering = await prisma.department.upsert({
        where: { name: 'Engineering' },
        update: {},
        create: { name: 'Engineering' },
    });

    const hr = await prisma.department.upsert({
        where: { name: 'HR' },
        update: {},
        create: { name: 'HR' },
    });

    const passwordHash = await bcrypt.hash('password123', 10);

    const manager = await prisma.user.upsert({
        where: { email: 'manager@example.com' },
        update: {},
        create: {
            name: 'Manager One',
            email: 'manager@example.com',
            passwordHash,
            role: UserRole.manager,
            departmentId: engineering.id,
        },
    });

    const employee = await prisma.user.upsert({
        where: { email: 'employee@example.com' },
        update: {},
        create: {
            name: 'Employee One',
            email: 'employee@example.com',
            passwordHash,
            role: UserRole.employee,
            departmentId: engineering.id,
            managerId: manager.id,
        },
    });

    const hrStaff = await prisma.user.upsert({
        where: { email: 'hr@example.com' },
        update: {},
        create: {
            name: 'HR Staff',
            email: 'hr@example.com',
            passwordHash,
            role: UserRole.employee,
            departmentId: hr.id,
        },
    });

    const leaveTypes = [
        {
            name: '年假',
            annualQuota: 10,
            carryOver: false,
            requireAttachment: false,
            isActive: true,
        },
        {
            name: '病假',
            annualQuota: 30,
            carryOver: false,
            requireAttachment: true,
            isActive: true,
        },
        {
            name: '事假',
            annualQuota: 7,
            carryOver: false,
            requireAttachment: false,
            isActive: true,
        },
        {
            name: '特休',
            annualQuota: 5,
            carryOver: false,
            requireAttachment: false,
            isActive: true,
        },
    ];

    const typeRecords: LeaveType[] = [];
    for (const t of leaveTypes) {
        const record = await prisma.leaveType.upsert({
            where: { name: t.name },
            update: {
                annualQuota: t.annualQuota,
                carryOver: t.carryOver,
                requireAttachment: t.requireAttachment,
                isActive: t.isActive,
            },
            create: t,
        });
        typeRecords.push(record);
    }

    for (const user of [manager, employee, hrStaff]) {
        for (const leaveType of typeRecords) {
            await prisma.leaveBalance.upsert({
                where: { userId_leaveTypeId_year: { userId: user.id, leaveTypeId: leaveType.id, year } },
                update: {
                    quota: leaveType.annualQuota,
                },
                create: {
                    userId: user.id,
                    leaveTypeId: leaveType.id,
                    year,
                    quota: leaveType.annualQuota,
                    usedDays: 0,
                    reservedDays: 0,
                },
            });
        }
    }

    console.log('Seed complete');
    console.log('Test accounts:');
    console.log('- manager@example.com / password123');
    console.log('- employee@example.com / password123');
    console.log('- hr@example.com / password123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
