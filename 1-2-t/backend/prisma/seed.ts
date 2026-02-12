import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function currentYear(): number {
  return new Date().getUTCFullYear();
}

async function main() {
  const year = currentYear();

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
      role: Role.manager,
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
      role: Role.employee,
      departmentId: engineering.id,
      managerId: manager.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'hr@example.com' },
    update: {},
    create: {
      name: 'HR Admin',
      email: 'hr@example.com',
      passwordHash,
      role: Role.manager,
      departmentId: hr.id,
    },
  });

  const hrAdmin = await prisma.user.findUnique({ where: { email: 'hr@example.com' } });

  const annualLeave = await prisma.leaveType.upsert({
    where: { name: 'Annual Leave' },
    update: {
      annualQuota: 14,
      requireAttachment: false,
      isActive: true,
    },
    create: {
      name: 'Annual Leave',
      annualQuota: 14,
      carryOver: false,
      requireAttachment: false,
      isActive: true,
    },
  });

  const sickLeave = await prisma.leaveType.upsert({
    where: { name: 'Sick Leave' },
    update: {
      annualQuota: 30,
      requireAttachment: true,
      isActive: true,
    },
    create: {
      name: 'Sick Leave',
      annualQuota: 30,
      carryOver: false,
      requireAttachment: true,
      isActive: true,
    },
  });

  const leaveTypes = [annualLeave, sickLeave];
  for (const lt of leaveTypes) {
    await prisma.leaveBalance.upsert({
      where: {
        userId_leaveTypeId_year: {
          userId: employee.id,
          leaveTypeId: lt.id,
          year,
        },
      },
      update: {
        quota: lt.annualQuota,
      },
      create: {
        userId: employee.id,
        leaveTypeId: lt.id,
        year,
        quota: lt.annualQuota,
        usedDays: 0,
        reservedDays: 0,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed completed', {
    year,
    users: {
      manager: manager.email,
      employee: employee.email,
      hr: hrAdmin?.email,
    },
    password: 'password123',
  });
}

main()
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
