import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const demoUpstreamUrl = 'http://localhost:4001';
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin-admin-admin';
  const adminHash = await argon2.hash(adminPassword);
  const developerEmail = 'dev@example.com';
  const developerPassword = 'correct-horse-battery-staple';
  const developerHash = await argon2.hash(developerPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, role: 'ADMIN', status: 'ACTIVE' },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const developer = await prisma.user.upsert({
    where: { email: developerEmail },
    update: { passwordHash: developerHash, role: 'DEVELOPER', status: 'ACTIVE' },
    create: {
      email: developerEmail,
      passwordHash: developerHash,
      role: 'DEVELOPER',
      status: 'ACTIVE',
    },
  });

  // Create a minimal API catalog
  const service = await prisma.apiService.upsert({
    where: { slug: 'demo' },
    update: { status: 'ACTIVE', upstreamUrl: demoUpstreamUrl },
    create: {
      slug: 'demo',
      name: 'Demo Service',
      upstreamUrl: demoUpstreamUrl,
      status: 'ACTIVE',
    },
  });

  const endpoint = await prisma.apiEndpoint.upsert({
    where: { id: `endpoint_${service.id}_GET_/hello` },
    update: { status: 'ACTIVE' },
    create: {
      id: `endpoint_${service.id}_GET_/hello`,
      serviceId: service.id,
      name: 'Hello',
      method: 'GET',
      pathPattern: '/hello',
      status: 'ACTIVE',
    },
  });

  const usageEndpoint = await prisma.apiEndpoint.upsert({
    where: { id: `endpoint_${service.id}_GET_/usage` },
    update: { status: 'ACTIVE' },
    create: {
      id: `endpoint_${service.id}_GET_/usage`,
      serviceId: service.id,
      name: 'Usage',
      method: 'GET',
      pathPattern: '/usage',
      status: 'ACTIVE',
    },
  });

  const scope = await prisma.apiScope.upsert({
    where: { key: 'demo.read' },
    update: { status: 'ACTIVE' },
    create: { key: 'demo.read', description: 'Read demo endpoints', status: 'ACTIVE' },
  });

  await prisma.endpointScopeAllow.upsert({
    where: { endpointId_scopeId: { endpointId: endpoint.id, scopeId: scope.id } },
    update: {},
    create: { endpointId: endpoint.id, scopeId: scope.id },
  });

  await prisma.endpointScopeAllow.upsert({
    where: { endpointId_scopeId: { endpointId: usageEndpoint.id, scopeId: scope.id } },
    update: {},
    create: { endpointId: usageEndpoint.id, scopeId: scope.id },
  });

  await prisma.rateLimitSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      defaultMinute: 60,
      defaultHour: 1_000,
      maxMinute: 600,
      maxHour: 10_000,
    },
  });

  await prisma.auditLog.deleteMany({
    where: { eventId: { in: ['seed-admin-login', 'seed-dev-ready'] } },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        eventId: 'seed-admin-login',
        actorUserId: admin.id,
        actorRole: 'ADMIN',
        action: 'seed.admin.login',
        targetType: 'USER',
        targetId: admin.id,
        success: true,
        metadata: { source: 'prisma-seed' },
      },
      {
        eventId: 'seed-dev-ready',
        actorUserId: developer.id,
        actorRole: 'DEVELOPER',
        action: 'seed.dev.ready',
        targetType: 'USER',
        targetId: developer.id,
        success: true,
        metadata: { source: 'prisma-seed' },
      },
    ],
  });

  await prisma.usageLog.deleteMany({
    where: { requestId: { in: ['seed-hello-200', 'seed-usage-200'] } },
  });

  await prisma.usageLog.createMany({
    data: [
      {
        requestId: 'seed-hello-200',
        userId: developer.id,
        serviceSlug: service.slug,
        endpointId: endpoint.id,
        method: 'GET',
        path: '/hello',
        statusCode: 200,
        durationMs: 28,
        outcome: 'SUCCESS',
      },
      {
        requestId: 'seed-usage-200',
        userId: developer.id,
        serviceSlug: service.slug,
        endpointId: usageEndpoint.id,
        method: 'GET',
        path: '/usage',
        statusCode: 200,
        durationMs: 42,
        outcome: 'SUCCESS',
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log({
    adminId: admin.id,
    adminEmail,
    adminPassword,
    developerId: developer.id,
    developerEmail,
    developerPassword,
    demoUpstreamUrl,
    serviceSlug: service.slug,
  });
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
