import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import bcrypt from 'bcrypt'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { createPrismaTestClient } from '../utils/prisma-test-client'
import { ErrorCodes } from '../../src/common/errors/error-codes'

describe('US1 integration: booking authorization (IDOR)', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let timeSlotId: string

  beforeAll(async () => {
    const testDb = await createTestDb()
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
        capacity: 2,
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

  async function register(role: 'USER' | 'PROVIDER'): Promise<string> {
    const email = `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
    const res = await api(app)
      .post('/auth/register')
      .send({ email, password: 'P@ssw0rd123!', role })
    expect(res.status).toBe(200)
    return res.body.accessToken as string
  }

  it("user cannot cancel another user's booking (404)", async () => {
    const tokenA = await register('USER')
    const tokenB = await register('USER')

    const createRes = await api(app).asBearer(tokenA).post('/bookings').send({ timeSlotId })
    expect(createRes.status).toBe(200)
    const bookingId = createRes.body.booking.id as string

    const listB = await api(app).asBearer(tokenB).get('/me/bookings')
    expect(listB.status).toBe(200)
    expect(Array.isArray(listB.body.items)).toBe(true)
    expect(listB.body.items.find((b: any) => b.id === bookingId)).toBeUndefined()

    const cancelByB = await api(app).asBearer(tokenB).post(`/bookings/${bookingId}/cancel`).send({})
    expect(cancelByB.status).toBe(404)
    expect(cancelByB.body?.code).toBe(ErrorCodes.NOT_FOUND)
  })
})
