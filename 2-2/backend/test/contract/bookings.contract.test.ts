import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { INestApplication } from '@nestjs/common'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import bcrypt from 'bcrypt'
import { createPrismaTestClient } from '../utils/prisma-test-client'

describe('Bookings contract', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let timeSlotId: string
  let userPassword: string

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
        capacity: 10,
        bookedCount: 0,
        status: 'OPEN',
        cancelDeadlineAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })
    timeSlotId = timeSlot.id

    userPassword = 'P@ssw0rd123!'

    await prisma.$disconnect()
  })

  afterAll(async () => {
    await app?.close()
    await cleanup?.()
  })

  async function loginAsUser(): Promise<string> {
    const userEmail = `user-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
    await api(app)
      .post('/auth/register')
      .send({ email: userEmail, password: userPassword, role: 'USER' })

    const loginRes = await api(app)
      .post('/auth/login')
      .send({ email: userEmail, password: userPassword })
    expect(loginRes.status).toBe(200)
    return loginRes.body.accessToken as string
  }

  it('POST /bookings returns { booking }', async () => {
    const token = await loginAsUser()
    const res = await api(app).asBearer(token).post('/bookings').send({ timeSlotId })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('booking')
    expect(res.body.booking).toMatchObject({ timeSlotId, status: 'CONFIRMED' })
  })

  it('GET /me/bookings returns { items }', async () => {
    const token = await loginAsUser()
    await api(app).asBearer(token).post('/bookings').send({ timeSlotId })

    const res = await api(app).asBearer(token).get('/me/bookings')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  it('POST /bookings/{bookingId}/cancel returns { booking }', async () => {
    const token = await loginAsUser()
    const createRes = await api(app).asBearer(token).post('/bookings').send({ timeSlotId })

    expect(createRes.status).toBe(200)
    const bookingId = createRes.body?.booking?.id as string
    expect(typeof bookingId).toBe('string')

    const res = await api(app).asBearer(token).post(`/bookings/${bookingId}/cancel`).send({})
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('booking')
    expect(res.body.booking).toMatchObject({ id: bookingId, status: 'CANCELLED' })
  })
})
