import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const platformAdmin = await prisma.user.upsert({
    where: { email: 'platform-admin@example.com' },
    update: {},
    create: {
      email: 'platform-admin@example.com',
      passwordHash,
      isPlatformAdmin: true,
    },
  });

  const orgAdmin = await prisma.user.upsert({
    where: { email: 'org-admin@example.com' },
    update: {},
    create: {
      email: 'org-admin@example.com',
      passwordHash,
      isPlatformAdmin: false,
    },
  });

  const endUser = await prisma.user.upsert({
    where: { email: 'end-user@example.com' },
    update: {},
    create: {
      email: 'end-user@example.com',
      passwordHash,
      isPlatformAdmin: false,
    },
  });

  const org = await prisma.organization.create({
    data: { name: 'Demo Organization' },
  });

  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: orgAdmin.id, role: 'ORG_ADMIN' },
      { organizationId: org.id, userId: endUser.id, role: 'END_USER' },
    ],
  });

  const pro = await prisma.plan.create({
    data: {
      name: 'Pro',
      billingCycle: 'monthly',
      priceCents: 1999,
      currency: 'USD',
      isActive: true,
      limits: JSON.stringify({ apiQuota: 100000, maxUsers: 20, maxProjects: 100, storageBytes: 10737418240 }),
      features: JSON.stringify({ advancedAnalytics: true, exportData: true, prioritySupport: false }),
    },
  });

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);

  const subscription = await prisma.subscription.create({
    data: {
      organizationId: org.id,
      planId: pro.id,
      status: 'Active',
      billingCycle: 'monthly',
      currentPeriodStart: now,
      currentPeriodEnd: end,
    },
  });

  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      subscriptionId: subscription.id,
      status: 'Open',
      billingPeriodStart: now,
      billingPeriodEnd: end,
      totalCents: 1999,
      currency: 'USD',
      invoiceType: 'RECURRING',
      dueAt: end,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: platformAdmin.id,
      actorRoleContext: 'PLATFORM_ADMIN',
      organizationId: org.id,
      action: 'SEED_INIT',
      targetType: 'Organization',
      targetId: org.id,
      payload: JSON.stringify({ note: 'seed completed' }),
    },
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
