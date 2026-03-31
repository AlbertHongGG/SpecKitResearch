import 'dotenv/config';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import {
  PrismaClient,
  ServiceStatus,
  TimeSlotStatus,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

function getSqliteFilePathFromDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (e.g. file:./dev.db)');
  }

  let filePath = databaseUrl;
  if (filePath.startsWith('file:')) {
    filePath = filePath.slice('file:'.length);
  }

  const queryIndex = filePath.indexOf('?');
  if (queryIndex >= 0) {
    filePath = filePath.slice(0, queryIndex);
  }

  if (!filePath) {
    throw new Error('DATABASE_URL must point to a SQLite file path (e.g. file:./dev.db)');
  }

  return filePath;
}

const adapter = new PrismaBetterSqlite3({
  url: getSqliteFilePathFromDatabaseUrl(process.env.DATABASE_URL),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'admin@example.com';
  const providerEmail = 'provider@example.com';
  const userEmail = 'user@example.com';
  const password = 'Password123!';

  // Deterministic UUIDs so frontend/runtime schemas (uuid) pass in E2E.
  // NOTE: Zod's uuid() validator enforces version/variant bits.
  const serviceId = '11111111-1111-4111-8111-111111111111';
  const timeSlotId = '22222222-2222-4222-8222-222222222222';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    create: {
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const provider = await prisma.user.upsert({
    where: { email: providerEmail },
    update: { role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
    create: {
      email: providerEmail,
      passwordHash,
      role: UserRole.PROVIDER,
      status: UserStatus.ACTIVE,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: { role: UserRole.USER, status: UserStatus.ACTIVE },
    create: {
      email: userEmail,
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
  });

  // Cleanup legacy seed rows created before we enforced UUID ids.
  await prisma.timeSlot.deleteMany({ where: { id: 'seed-timeslot-1' } });
  await prisma.timeSlot.deleteMany({ where: { serviceId: 'seed-service-1' } });
  await prisma.service.deleteMany({ where: { id: 'seed-service-1' } });

  // Cleanup previously seeded invalid UUID ids (older deterministic placeholders).
  await prisma.timeSlot.deleteMany({ where: { id: '22222222-2222-2222-2222-222222222222' } });
  await prisma.service.deleteMany({ where: { id: '11111111-1111-1111-1111-111111111111' } });

  const service = await prisma.service.upsert({
    where: { id: serviceId },
    update: {
      providerId: provider.id,
      status: ServiceStatus.ACTIVE,
    },
    create: {
      id: serviceId,
      providerId: provider.id,
      name: '示範服務',
      description: '用於開發與 E2E 的示範服務',
      durationMinutes: 30,
      status: ServiceStatus.ACTIVE,
    },
  });

  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const cancelDeadlineAt = new Date(start.getTime() - 10 * 60 * 1000);

  // Ensure E2E remains idempotent: clear any previous bookings for the deterministic seed slot.
  await prisma.booking.deleteMany({ where: { timeSlotId } });

  await prisma.timeSlot.upsert({
    where: { id: timeSlotId },
    update: {
      serviceId: service.id,
      startTime: start,
      endTime: end,
      capacity: 3,
      bookedCount: 0,
      status: TimeSlotStatus.OPEN,
      cancelDeadlineAt,
    },
    create: {
      id: timeSlotId,
      serviceId: service.id,
      startTime: start,
      endTime: end,
      capacity: 3,
      bookedCount: 0,
      status: TimeSlotStatus.OPEN,
      cancelDeadlineAt,
    },
  });

  console.log('Seeded users:', { admin: admin.email, provider: provider.email, user: user.email });
  console.log('Seeded service:', { id: service.id, name: service.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
