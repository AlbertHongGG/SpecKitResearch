import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // Plans (data-driven)
  const plans = [
    {
      name: 'Free',
      billingCycle: 'monthly',
      priceCents: 0,
      currency: 'USD',
      isActive: true,
      limits: {
        API_CALLS: { limit: 1000, policy: 'block' },
        STORAGE_BYTES: { limit: 1_000_000_000, policy: 'block' },
        USER_COUNT: { limit: 3, policy: 'block' },
        PROJECT_COUNT: { limit: 1, policy: 'block' },
      },
      features: { advancedAnalytics: false, exportData: false, prioritySupport: false },
    },
    {
      name: 'Pro',
      billingCycle: 'monthly',
      priceCents: 2000,
      currency: 'USD',
      isActive: true,
      limits: {
        API_CALLS: { limit: 100000, policy: 'throttle' },
        STORAGE_BYTES: { limit: 50_000_000_000, policy: 'overage' },
        USER_COUNT: { limit: 50, policy: 'block' },
        PROJECT_COUNT: { limit: 50, policy: 'block' },
      },
      features: { advancedAnalytics: true, exportData: true, prioritySupport: false },
    },
    {
      name: 'Enterprise',
      billingCycle: 'monthly',
      priceCents: 10000,
      currency: 'USD',
      isActive: true,
      limits: {
        API_CALLS: { limit: 1000000, policy: 'overage' },
        STORAGE_BYTES: { limit: 500_000_000_000, policy: 'overage' },
        USER_COUNT: { limit: 500, policy: 'block' },
        PROJECT_COUNT: { limit: 500, policy: 'block' },
      },
      features: { advancedAnalytics: true, exportData: true, prioritySupport: true },
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { id: `${p.name}-${p.billingCycle}` },
      create: {
        id: `${p.name}-${p.billingCycle}`,
        ...p,
      },
      update: {
        ...p,
      },
    });
  }

  // Platform admin user
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin1234';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword),
      isPlatformAdmin: true,
    },
    update: {
      isPlatformAdmin: true,
    },
  });

  // Org + org admin
  const orgAdminEmail = 'orgadmin@example.com';
  const orgAdminPassword = 'orgadmin1234';
  const orgAdmin = await prisma.user.upsert({
    where: { email: orgAdminEmail },
    create: {
      email: orgAdminEmail,
      passwordHash: await argon2.hash(orgAdminPassword),
      isPlatformAdmin: false,
    },
    update: {},
  });

  const org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    create: { id: 'demo-org', name: 'Demo Org' },
    update: {},
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: orgAdmin.id } },
    create: {
      organizationId: org.id,
      userId: orgAdmin.id,
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
    },
    update: { role: 'ORG_ADMIN', status: 'ACTIVE' },
  });

  // Default subscription: Free, Active
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  await prisma.subscription.upsert({
    where: { id: 'demo-subscription' },
    create: {
      id: 'demo-subscription',
      organizationId: org.id,
      planId: 'Free-monthly',
      status: 'Active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      isCurrent: true,
    },
    update: {
      planId: 'Free-monthly',
      status: 'Active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      isCurrent: true,
    },
  });

  // Additional orgs/users for E2E isolation

  // PastDue scenario org
  const pastDueAdminEmail = 'pastdueadmin@example.com';
  const pastDueAdminPassword = 'pastdueadmin1234';
  const pastDueAdmin = await prisma.user.upsert({
    where: { email: pastDueAdminEmail },
    create: {
      email: pastDueAdminEmail,
      passwordHash: await argon2.hash(pastDueAdminPassword),
      isPlatformAdmin: false,
    },
    update: {},
  });

  const pastDueOrg = await prisma.organization.upsert({
    where: { id: 'pastdue-org' },
    create: { id: 'pastdue-org', name: 'PastDue Org' },
    update: {},
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: pastDueOrg.id, userId: pastDueAdmin.id } },
    create: {
      organizationId: pastDueOrg.id,
      userId: pastDueAdmin.id,
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
    },
    update: { role: 'ORG_ADMIN', status: 'ACTIVE' },
  });

  await prisma.subscription.upsert({
    where: { id: 'pastdue-subscription' },
    create: {
      id: 'pastdue-subscription',
      organizationId: pastDueOrg.id,
      planId: 'Free-monthly',
      status: 'Active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      isCurrent: true,
    },
    update: {
      planId: 'Free-monthly',
      status: 'Active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      isCurrent: true,
    },
  });

  // Multi-org RBAC/IDOR scenario
  const multiEmail = 'multi@example.com';
  const multiPassword = 'multi1234';
  const multiUser = await prisma.user.upsert({
    where: { email: multiEmail },
    create: {
      email: multiEmail,
      passwordHash: await argon2.hash(multiPassword),
      isPlatformAdmin: false,
    },
    update: {},
  });

  const orgA = await prisma.organization.upsert({
    where: { id: 'org-a' },
    create: { id: 'org-a', name: 'Org A' },
    update: {},
  });

  const orgB = await prisma.organization.upsert({
    where: { id: 'org-b' },
    create: { id: 'org-b', name: 'Org B' },
    update: {},
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: orgA.id, userId: multiUser.id } },
    create: {
      organizationId: orgA.id,
      userId: multiUser.id,
      role: 'END_USER',
      status: 'ACTIVE',
    },
    update: { role: 'END_USER', status: 'ACTIVE' },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: orgB.id, userId: multiUser.id } },
    create: {
      organizationId: orgB.id,
      userId: multiUser.id,
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
    },
    update: { role: 'ORG_ADMIN', status: 'ACTIVE' },
  });

  await prisma.subscription.upsert({
    where: { id: 'org-a-subscription' },
    create: {
      id: 'org-a-subscription',
      organizationId: orgA.id,
      planId: 'Free-monthly',
      status: 'Active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      isCurrent: true,
    },
    update: {
      planId: 'Free-monthly',
      status: 'Active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      isCurrent: true,
    },
  });

  await prisma.subscription.upsert({
    where: { id: 'org-b-subscription' },
    create: {
      id: 'org-b-subscription',
      organizationId: orgB.id,
      planId: 'Free-monthly',
      status: 'Active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      isCurrent: true,
    },
    update: {
      planId: 'Free-monthly',
      status: 'Active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      isCurrent: true,
    },
  });

  // Override irreversible test org (membership not required)
  await prisma.organization.upsert({
    where: { id: 'override-org' },
    create: { id: 'override-org', name: 'Override Org' },
    update: {},
  });

  await prisma.subscription.upsert({
    where: { id: 'override-subscription' },
    create: {
      id: 'override-subscription',
      organizationId: 'override-org',
      planId: 'Free-monthly',
      status: 'Active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      isCurrent: true,
    },
    update: {
      planId: 'Free-monthly',
      status: 'Active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      isCurrent: true,
    },
  });

  // Minimal audit record for seed
  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      actorRoleContext: 'PLATFORM_ADMIN',
      organizationId: org.id,
      action: 'SEED',
      targetType: 'SYSTEM',
      payload: {
        note: 'seeded demo data',
        accounts: {
          platformAdmin: { email: adminEmail },
          orgAdmin: { email: orgAdminEmail },
          pastDueAdmin: { email: pastDueAdminEmail },
          multiUser: { email: multiEmail },
        }
      },
    },
  });

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
