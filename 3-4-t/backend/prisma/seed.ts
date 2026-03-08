import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/domain/auth/password';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@example.com';
  const devEmail = 'dev@example.com';
  const defaultPassword = 'password123';

  const [adminHash, devHash] = await Promise.all([
    hashPassword(defaultPassword),
    hashPassword(defaultPassword),
  ]);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password_hash: adminHash,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: devEmail },
    update: {},
    create: {
      email: devEmail,
      password_hash: devHash,
      role: 'USER_DEVELOPER',
    },
  });

  await prisma.paymentMethod.upsert({
    where: { code: 'card' },
    update: { display_name: 'Card', enabled: true, sort_order: 1 },
    create: { code: 'card', display_name: 'Card', enabled: true, sort_order: 1 },
  });

  await prisma.paymentMethod.upsert({
    where: { code: 'atm' },
    update: { display_name: 'ATM', enabled: true, sort_order: 2 },
    create: { code: 'atm', display_name: 'ATM', enabled: true, sort_order: 2 },
  });

  const scenarioTypes = ['success', 'failed', 'cancelled', 'timeout', 'delayed_success'] as const;
  for (const type of scenarioTypes) {
    await prisma.simulationScenarioTemplate.upsert({
      where: { id: `seed_${type}` },
      update: {},
      create: {
        id: `seed_${type}`,
        type,
        default_delay_sec: type === 'delayed_success' ? 3 : 0,
        default_error_code: type === 'failed' ? 'FAILED' : null,
        default_error_message: type === 'failed' ? 'Simulated failure' : null,
        enabled: true,
      },
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: 'allowed_currencies' },
    update: {},
    create: { key: 'allowed_currencies', value_json: ['TWD', 'USD'] },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'default_return_method' },
    update: {},
    create: { key: 'default_return_method', value_json: 'query_string' },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'session_ttl_sec' },
    update: {},
    create: { key: 'session_ttl_sec', value_json: 8 * 60 * 60 },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
