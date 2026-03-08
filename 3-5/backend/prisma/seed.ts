import { PrismaClient, ResourceStatus, ScopeRuleEffect, UserRole, UserStatus } from '@prisma/client';

import { hashPassword } from '../src/shared/crypto/password-hash';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const adminEmail = 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'password123';
  const adminPasswordHash = await hashPassword(adminPassword);

  await prisma.rateLimitPolicy.upsert({
    where: { id: 'default' },
    update: {
      defaultPerMinute: 60,
      defaultPerHour: 1000,
      capPerMinute: 600,
      capPerHour: 10_000
    },
    create: {
      id: 'default',
      defaultPerMinute: 60,
      defaultPerHour: 1000,
      capPerMinute: 600,
      capPerHour: 10_000
    }
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.admin,
      status: UserStatus.active,
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: UserRole.admin,
      status: UserStatus.active
    }
  });

  const demoService = await prisma.apiService.upsert({
    where: { name: 'demo' },
    update: { status: ResourceStatus.active },
    create: {
      name: 'demo',
      description: 'Demo service for local development',
      status: ResourceStatus.active
    }
  });

  const demoEndpoint = await prisma.apiEndpoint.upsert({
    where: {
      serviceId_method_path: {
        serviceId: demoService.id,
        method: 'GET',
        path: '/demo/ping'
      }
    },
    update: { status: ResourceStatus.active },
    create: {
      serviceId: demoService.id,
      method: 'GET',
      path: '/demo/ping',
      description: 'Demo protected endpoint',
      status: ResourceStatus.active
    }
  });

  const scope = await prisma.apiScope.upsert({
    where: { name: 'demo:read' },
    update: {},
    create: {
      name: 'demo:read',
      description: 'Allow calling demo endpoints'
    }
  });

  // Extra scope for demo/testing: exists but does not allow any endpoints by default.
  await prisma.apiScope.upsert({
    where: { name: 'other:read' },
    update: {},
    create: {
      name: 'other:read',
      description: 'A scope with no allow rules (used for 403 demo)'
    }
  });

  await prisma.apiScopeRule.upsert({
    where: { scopeId_endpointId: { scopeId: scope.id, endpointId: demoEndpoint.id } },
    update: {},
    create: {
      scopeId: scope.id,
      endpointId: demoEndpoint.id,
      effect: ScopeRuleEffect.allow
    }
  });
}

main()
  .catch((err) => {
    process.stderr.write(`${String(err)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
