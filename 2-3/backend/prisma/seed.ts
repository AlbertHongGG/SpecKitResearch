import { ApiKeyStatus, PrismaClient, ResourceStatus, ScopeRuleEffect, UserRole, UserStatus } from '@prisma/client';

import { hashApiKeySecret } from '../src/shared/crypto/api-key-hash';
import { parseApiKey } from '../src/shared/crypto/api-key-format';
import { hashPassword } from '../src/shared/crypto/password-hash';

const prisma = new PrismaClient();

const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'password123';
const knownApiKeys = {
  demoRead: `ak_demoPublic01_${'A'.repeat(43)}`,
  noScope: `ak_demoPublic02_${'B'.repeat(43)}`,
  blocked: `ak_demoPublic03_${'C'.repeat(43)}`
};

async function upsertUser(input: {
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
}) {
  const passwordHash = await hashPassword(input.password);

  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash,
      role: input.role,
      status: input.status
    },
    create: {
      email: input.email,
      passwordHash,
      role: input.role,
      status: input.status
    }
  });
}

async function upsertKnownApiKey(input: {
  userId: string;
  plaintext: string;
  name: string;
  status: ApiKeyStatus;
  scopes: string[];
  rateLimitPerMinute?: number | null;
  rateLimitPerHour?: number | null;
}) {
  const parsed = parseApiKey(input.plaintext);
  if (!parsed) {
    throw new Error(`Invalid seeded API key format: ${input.name}`);
  }

  const hash = hashApiKeySecret(parsed.secret);
  const scopes = await prisma.apiScope.findMany({
    where: { name: { in: input.scopes } },
    select: { id: true, name: true }
  });

  if (scopes.length !== input.scopes.length) {
    throw new Error(`Missing scopes for seeded key: ${input.name}`);
  }

  await prisma.apiKey.upsert({
    where: { publicId: parsed.publicId },
    update: {
      userId: input.userId,
      name: input.name,
      hash,
      status: input.status,
      expiresAt: null,
      revokedAt: null,
      rateLimitPerMinute: input.rateLimitPerMinute ?? null,
      rateLimitPerHour: input.rateLimitPerHour ?? null,
      scopes: {
        deleteMany: {},
        createMany: {
          data: scopes.map((scope) => ({ scopeId: scope.id }))
        }
      }
    },
    create: {
      userId: input.userId,
      publicId: parsed.publicId,
      name: input.name,
      hash,
      status: input.status,
      expiresAt: null,
      revokedAt: null,
      rateLimitPerMinute: input.rateLimitPerMinute ?? null,
      rateLimitPerHour: input.rateLimitPerHour ?? null,
      scopes: {
        createMany: {
          data: scopes.map((scope) => ({ scopeId: scope.id }))
        }
      }
    }
  });
}

async function main(): Promise<void> {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? defaultPassword;

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

  const adminUser = await upsertUser({
    email: 'admin@example.com',
    password: adminPassword,
    role: UserRole.admin,
    status: UserStatus.active
  });

  const developerUser = await upsertUser({
    email: 'developer@example.com',
    password: defaultPassword,
    role: UserRole.developer,
    status: UserStatus.active
  });

  await upsertUser({
    email: 'disabled@example.com',
    password: defaultPassword,
    role: UserRole.developer,
    status: UserStatus.disabled
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

  await upsertKnownApiKey({
    userId: developerUser.id,
    plaintext: knownApiKeys.demoRead,
    name: 'Seeded Demo Key',
    status: ApiKeyStatus.active,
    scopes: ['demo:read'],
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000
  });

  await upsertKnownApiKey({
    userId: developerUser.id,
    plaintext: knownApiKeys.noScope,
    name: 'Seeded No Scope Key',
    status: ApiKeyStatus.active,
    scopes: ['other:read'],
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000
  });

  await upsertKnownApiKey({
    userId: adminUser.id,
    plaintext: knownApiKeys.blocked,
    name: 'Seeded Blocked Key',
    status: ApiKeyStatus.blocked,
    scopes: ['demo:read'],
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000
  });

  process.stdout.write(
    [
      'Seeded test accounts:',
      `- admin@example.com / ${adminPassword}`,
      `- developer@example.com / ${defaultPassword}`,
      `- disabled@example.com / ${defaultPassword}`,
      'Seeded API keys:',
      `- demo:read => ${knownApiKeys.demoRead}`,
      `- other:read => ${knownApiKeys.noScope}`,
      `- blocked => ${knownApiKeys.blocked}`
    ].join('\n') + '\n'
  );
}

main()
  .catch((err) => {
    process.stderr.write(`${String(err)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
