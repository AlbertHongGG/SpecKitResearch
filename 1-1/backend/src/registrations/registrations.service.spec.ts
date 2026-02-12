import { HttpException } from '@nestjs/common'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { AuditService } from '../audit/audit.service'
import { ViewerStateService } from '../activities/viewer-state.service'
import { IdempotencyService } from '../common/idempotency/idempotency.service'
import { PrismaService } from '../common/prisma/prisma.service'
import { RegistrationsService } from './registrations.service'

class FixedTimeService {
  constructor(private readonly fixed: Date) {}
  now() {
    return this.fixed
  }
}

jest.setTimeout(30_000)

describe('RegistrationsService (US1/US2)', () => {
  const backendDir = findBackendDir()
  const dbFile = path.resolve(backendDir, 'test-registrations.db')
  const databaseUrl = `file:${dbFile}`

  let prisma: PrismaService

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl
    const schemaPath = path.resolve(backendDir, 'prisma/schema.prisma')

    fs.rmSync(dbFile, { force: true })
    execSync(`npx prisma migrate deploy --schema "${schemaPath}"`, {
      cwd: backendDir,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: 'pipe',
    })

    prisma = new PrismaService()
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma?.$disconnect()
    fs.rmSync(dbFile, { force: true })
  })

  beforeEach(async () => {
    await prisma.idempotencyKey.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.registration.deleteMany()
    await prisma.activity.deleteMany()
    await prisma.user.deleteMany()
  })

  it('register success; retry does not decrement again', async () => {
    const now = new Date('2026-01-30T10:00:00.000Z')
    const time = new FixedTimeService(now)

    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@test.local',
        passwordHash: 'x',
        role: 'admin',
      },
    })

    const member = await prisma.user.create({
      data: {
        name: 'Member',
        email: 'member@test.local',
        passwordHash: 'x',
        role: 'member',
      },
    })

    const activity = await prisma.activity.create({
      data: {
        title: 'A',
        description: 'D',
        date: new Date('2026-02-01T10:00:00.000Z'),
        deadline: new Date('2026-01-31T10:00:00.000Z'),
        location: 'L',
        capacity: 2,
        remainingSlots: 2,
        status: 'published',
        createdById: admin.id,
      },
    })

    const service = new RegistrationsService(
      prisma,
      new IdempotencyService(prisma),
      new AuditService(prisma),
      time as any,
      new ViewerStateService(),
    )

    const first = await service.register({
      userId: member.id,
      activityId: activity.id,
      idempotencyKey: 'k1',
    })

    expect(first.registration_state).toBe('registered')

    const afterFirst = await prisma.activity.findUnique({ where: { id: activity.id } })
    expect(afterFirst?.remainingSlots).toBe(1)

    const replay = await service.register({
      userId: member.id,
      activityId: activity.id,
      idempotencyKey: 'k1',
    })

    expect(replay.registration_state).toBe('registered')

    const afterReplay = await prisma.activity.findUnique({ where: { id: activity.id } })
    expect(afterReplay?.remainingSlots).toBe(1)

    const already = await service.register({
      userId: member.id,
      activityId: activity.id,
      idempotencyKey: 'k2',
    })

    expect(already.registration_state).toBe('already_registered')

    const afterAlready = await prisma.activity.findUnique({ where: { id: activity.id } })
    expect(afterAlready?.remainingSlots).toBe(1)
  })

  it('full activity returns 409 FULL and does not change remaining slots', async () => {
    const now = new Date('2026-01-30T10:00:00.000Z')
    const time = new FixedTimeService(now)

    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin2@test.local',
        passwordHash: 'x',
        role: 'admin',
      },
    })

    const member = await prisma.user.create({
      data: {
        name: 'Member',
        email: 'member2@test.local',
        passwordHash: 'x',
        role: 'member',
      },
    })

    const activity = await prisma.activity.create({
      data: {
        title: 'Full',
        description: 'D',
        date: new Date('2026-02-01T10:00:00.000Z'),
        deadline: new Date('2026-01-31T10:00:00.000Z'),
        location: 'L',
        capacity: 1,
        remainingSlots: 0,
        status: 'full',
        createdById: admin.id,
      },
    })

    const service = new RegistrationsService(
      prisma,
      new IdempotencyService(prisma),
      new AuditService(prisma),
      time as any,
      new ViewerStateService(),
    )

    try {
      await service.register({
        userId: member.id,
        activityId: activity.id,
        idempotencyKey: 'k1',
      })
      throw new Error('expected HttpException')
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException)
      const he = e as HttpException
      expect(he.getStatus()).toBe(409)
      expect(he.getResponse()).toMatchObject({ code: 'FULL' })
    }

    const after = await prisma.activity.findUnique({ where: { id: activity.id } })
    expect(after?.remainingSlots).toBe(0)
  })

  it('cancel success releases slot and changes status full -> published', async () => {
    const now = new Date('2026-01-30T10:00:00.000Z')
    const time = new FixedTimeService(now)

    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin3@test.local',
        passwordHash: 'x',
        role: 'admin',
      },
    })

    const member = await prisma.user.create({
      data: {
        name: 'Member',
        email: 'member3@test.local',
        passwordHash: 'x',
        role: 'member',
      },
    })

    const activity = await prisma.activity.create({
      data: {
        title: 'Full to Published',
        description: 'D',
        date: new Date('2026-02-01T10:00:00.000Z'),
        deadline: new Date('2026-01-31T10:00:00.000Z'),
        location: 'L',
        capacity: 1,
        remainingSlots: 0,
        status: 'full',
        createdById: admin.id,
      },
    })

    await prisma.registration.create({
      data: {
        userId: member.id,
        activityId: activity.id,
      },
    })

    const service = new RegistrationsService(
      prisma,
      new IdempotencyService(prisma),
      new AuditService(prisma),
      time as any,
      new ViewerStateService(),
    )

    const first = await service.cancel({
      userId: member.id,
      activityId: activity.id,
      idempotencyKey: 'c1',
    })

    expect(first.registration_state).toBe('canceled')

    const afterFirst = await prisma.activity.findUnique({ where: { id: activity.id } })
    expect(afterFirst?.remainingSlots).toBe(1)
    expect(afterFirst?.status).toBe('published')

    const replay = await service.cancel({
      userId: member.id,
      activityId: activity.id,
      idempotencyKey: 'c1',
    })

    expect(replay.registration_state).toBe('canceled')

    const afterReplay = await prisma.activity.findUnique({ where: { id: activity.id } })
    expect(afterReplay?.remainingSlots).toBe(1)

    const already = await service.cancel({
      userId: member.id,
      activityId: activity.id,
      idempotencyKey: 'c2',
    })

    expect(already.registration_state).toBe('already_canceled')
    const afterAlready = await prisma.activity.findUnique({ where: { id: activity.id } })
    expect(afterAlready?.remainingSlots).toBe(1)
  })

  it('cannot cancel after deadline or after ended', async () => {
    const now = new Date('2026-02-02T10:00:00.000Z')
    const time = new FixedTimeService(now)

    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin4@test.local',
        passwordHash: 'x',
        role: 'admin',
      },
    })

    const member = await prisma.user.create({
      data: {
        name: 'Member',
        email: 'member4@test.local',
        passwordHash: 'x',
        role: 'member',
      },
    })

    const activity = await prisma.activity.create({
      data: {
        title: 'Ended',
        description: 'D',
        date: new Date('2026-02-01T10:00:00.000Z'),
        deadline: new Date('2026-01-31T10:00:00.000Z'),
        location: 'L',
        capacity: 2,
        remainingSlots: 1,
        status: 'published',
        createdById: admin.id,
      },
    })

    await prisma.registration.create({
      data: {
        userId: member.id,
        activityId: activity.id,
      },
    })

    const service = new RegistrationsService(
      prisma,
      new IdempotencyService(prisma),
      new AuditService(prisma),
      time as any,
      new ViewerStateService(),
    )

    try {
      await service.cancel({
        userId: member.id,
        activityId: activity.id,
        idempotencyKey: 'c1',
      })
      throw new Error('expected HttpException')
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException)
      const he = e as HttpException
      expect(he.getStatus()).toBe(422)
    }

    const after = await prisma.activity.findUnique({ where: { id: activity.id } })
    expect(after?.remainingSlots).toBe(1)

    const reg = await prisma.registration.findUnique({
      where: { userId_activityId: { userId: member.id, activityId: activity.id } },
    })
    expect(reg?.canceledAt).toBeNull()
  })
})

function findBackendDir(): string {
  const cwd = process.cwd()
  const candidates = [cwd, path.resolve(cwd, 'backend'), path.resolve(__dirname, '../../..')]
  for (const dir of candidates) {
    if (fs.existsSync(path.resolve(dir, 'prisma/schema.prisma'))) return dir
  }
  throw new Error('Could not locate backend directory (missing prisma/schema.prisma)')
}
