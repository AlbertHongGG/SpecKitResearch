import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin-admin-admin';
  const adminHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN', status: 'ACTIVE' },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // Create a minimal API catalog
  const service = await prisma.apiService.upsert({
    where: { slug: 'demo' },
    update: { status: 'ACTIVE', upstreamUrl: 'http://localhost:4000' },
    create: {
      slug: 'demo',
      name: 'Demo Service',
      upstreamUrl: 'http://localhost:4000',
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

  // eslint-disable-next-line no-console
  console.log({ adminId: admin.id, adminEmail, adminPassword, serviceSlug: service.slug });
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
