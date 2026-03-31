import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import bcrypt from 'bcrypt'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { createPrismaTestClient } from '../utils/prisma-test-client'
import { ErrorCodes } from '../../src/common/errors/error-codes'

describe('US1 integration: booking concurrency', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let timeSlotId: string
  let databaseUrl: string

  beforeAll(async () => {
    const testDb = await createTestDb()
    databaseUrl = testDb.databaseUrl
    cleanup = testDb.cleanup
    migrateDatabase(testDb.databaseUrl)
    app = await createTestApp({ databaseUrl: testDb.databaseUrl })

    const prisma = createPrismaTestClient(testDb.databaseUrl)

    const provider = await prisma.user.create({
      data: {
        email: `provider-${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash('P@ssw0rd123!', 10),
        role: 'PROVIDER',
        status: 'ACTIVE',
      },
    })
    const service = await prisma.service.create({
      data: {
        providerId: provider.id,
        name: 'Test Service',
        description: 'Test description',
        durationMinutes: 60,
        status: 'ACTIVE',
      },
    })

    const start = new Date(Date.now() + 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const timeSlot = await prisma.timeSlot.create({
      data: {
        serviceId: service.id,
        startTime: start,
        endTime: end,
        capacity: 1,
        bookedCount: 0,
        status: 'OPEN',
        cancelDeadlineAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })
    timeSlotId = timeSlot.id

    await prisma.$disconnect()
  })

  afterAll(async () => {
    await app?.close()
    await cleanup?.()
  })

  async function registerUserAndGetToken(): Promise<string> {
    const email = `user-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
    const res = await api(app)
      .post('/auth/register')
      .send({ email, password: 'P@ssw0rd123!', role: 'USER' })
    expect(res.status).toBe(200)
    return res.body.accessToken as string
  }

  it('does not oversell: only one booking succeeds for capacity=1', async () => {
    const tokens = await Promise.all(Array.from({ length: 5 }).map(() => registerUserAndGetToken()))

    const results = await Promise.all(
      tokens.map((token) => api(app).asBearer(token).post('/bookings').send({ timeSlotId })),
    )

    const ok = results.filter((r) => r.status === 200)
    const conflicts = results.filter((r) => r.status === 409)

    expect(ok.length).toBe(1)
    expect(conflicts.length).toBe(results.length - 1)
    for (const r of conflicts) {
      expect(r.body?.code).toBe(ErrorCodes.CAPACITY_FULL)
    }

    const prisma = createPrismaTestClient(databaseUrl)
    const slot = await prisma.timeSlot.findUnique({ where: { id: timeSlotId } })
    expect(slot?.bookedCount).toBe(1)
    const bookingCount = await prisma.booking.count({
      where: { timeSlotId, status: { in: ['PENDING', 'CONFIRMED'] } },
    })
    expect(bookingCount).toBe(1)
    await prisma.$disconnect()
  })
})
