import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import bcrypt from 'bcrypt'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { createPrismaTestClient } from '../utils/prisma-test-client'
import { ErrorCodes } from '../../src/common/errors/error-codes'

describe('US1 integration: booking role guard', () => {
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

  it('guest must be rejected (401) when creating booking', async () => {
    const res = await api(app).post('/bookings').send({ timeSlotId })
    expect(res.status).toBe(401)
    expect(res.body?.code).toBe(ErrorCodes.UNAUTHORIZED)
  })

  it('provider must be rejected (403) when creating booking', async () => {
    const email = `provider2-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
    const registerRes = await api(app)
      .post('/auth/register')
      .send({ email, password: 'P@ssw0rd123!', role: 'PROVIDER' })
    expect(registerRes.status).toBe(200)
    const token = registerRes.body.accessToken as string

    const res = await api(app).asBearer(token).post('/bookings').send({ timeSlotId })
    expect(res.status).toBe(403)
    expect(res.body?.code).toBe(ErrorCodes.FORBIDDEN)
  })
})
