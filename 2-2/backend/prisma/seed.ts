import 'dotenv/config'
import bcrypt from 'bcrypt'
import path from 'node:path'

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient, ServiceStatus, TimeSlotStatus, UserRole, UserStatus } from '@prisma/client'

function sqliteFilePathFromDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) return 'dev.db'
  if (!databaseUrl.startsWith('file:')) return 'dev.db'

  // Examples:
  // - file:./dev.db
  // - file:dev.db
  // - file:C:/path/to/dev.db
  const raw = databaseUrl.slice('file:'.length)
  const normalized = raw.startsWith('//') ? raw.slice(2) : raw
  const withoutLeadingDotSlash = normalized.startsWith('./') ? normalized.slice(2) : normalized
  return withoutLeadingDotSlash.length > 0 ? withoutLeadingDotSlash : 'dev.db'
}

const sqliteFilePath = sqliteFilePathFromDatabaseUrl(process.env.DATABASE_URL)
const sqliteDbAbsolutePath = path.resolve(process.cwd(), sqliteFilePath)
const adapter = new PrismaBetterSqlite3({ url: sqliteDbAbsolutePath })

const prisma = new PrismaClient({ adapter })

async function main() {
  const adminPasswordHash = await bcrypt.hash('admin1234', 10)
  const providerPasswordHash = await bcrypt.hash('provider1234', 10)
  const userPasswordHash = await bcrypt.hash('user1234', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: adminPasswordHash,
    },
    create: {
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: adminPasswordHash,
    },
  })

  const provider = await prisma.user.upsert({
    where: { email: 'provider@example.com' },
    update: {
      role: UserRole.PROVIDER,
      status: UserStatus.ACTIVE,
      passwordHash: providerPasswordHash,
    },
    create: {
      email: 'provider@example.com',
      role: UserRole.PROVIDER,
      status: UserStatus.ACTIVE,
      passwordHash: providerPasswordHash,
    },
  })

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      passwordHash: userPasswordHash,
    },
    create: {
      email: 'user@example.com',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      passwordHash: userPasswordHash,
    },
  })

  const service = await prisma.service.create({
    data: {
      providerId: provider.id,
      name: '示範服務（30 分鐘）',
      description: '用於本機開發與測試的 seed 服務',
      durationMinutes: 30,
      status: ServiceStatus.ACTIVE,
    },
  })

  const now = new Date()
  const start1 = new Date(now.getTime() + 60 * 60 * 1000)
  const end1 = new Date(start1.getTime() + 30 * 60 * 1000)
  const cancelDeadline1 = new Date(start1.getTime() - 15 * 60 * 1000)

  await prisma.timeSlot.create({
    data: {
      serviceId: service.id,
      startTime: start1,
      endTime: end1,
      capacity: 1,
      bookedCount: 0,
      status: TimeSlotStatus.OPEN,
      cancelDeadlineAt: cancelDeadline1,
    },
  })

  const start2 = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const end2 = new Date(start2.getTime() + 30 * 60 * 1000)
  const cancelDeadline2 = new Date(start2.getTime() - 15 * 60 * 1000)

  await prisma.timeSlot.create({
    data: {
      serviceId: service.id,
      startTime: start2,
      endTime: end2,
      capacity: 3,
      bookedCount: 0,
      status: TimeSlotStatus.OPEN,
      cancelDeadlineAt: cancelDeadline2,
    },
  })

  console.log('Seed created:')
  console.log({ adminEmail: admin.email, providerEmail: provider.email, userEmail: user.email })
  console.log('Passwords: admin1234 / provider1234 / user1234')
  console.log({ sampleServiceId: service.id, sampleUserId: user.id })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
