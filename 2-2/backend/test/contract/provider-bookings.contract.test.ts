import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { createPrismaTestClient } from '../utils/prisma-test-client'

describe('Provider bookings contract', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let providerToken: string
  let userToken: string
  let timeSlotId: string
  let bookingId: string
  let databaseUrl: string

  beforeAll(async () => {
    const testDb = await createTestDb()
    databaseUrl = testDb.databaseUrl
    cleanup = testDb.cleanup
    migrateDatabase(testDb.databaseUrl)
    app = await createTestApp({ databaseUrl: testDb.databaseUrl })

    const providerEmail = `provider-${Date.now()}@example.com`
    const provider = await api(app)
      .post('/auth/register')
      .send({ email: providerEmail, password: 'P@ssw0rd123!', role: 'PROVIDER' })
    expect(provider.status).toBe(200)
    providerToken = provider.body.accessToken as string

    const userEmail = `user-${Date.now()}@example.com`
    const user = await api(app)
      .post('/auth/register')
      .send({ email: userEmail, password: 'P@ssw0rd123!', role: 'USER' })
    expect(user.status).toBe(200)
    userToken = user.body.accessToken as string

    // Create a service/time slot directly (keeps this test focused on booking endpoints).
    const prisma = createPrismaTestClient(testDb.databaseUrl)
    const providerRow = await prisma.user.findUnique({ where: { email: providerEmail } })
    expect(providerRow).toBeTruthy()

    const service = await prisma.service.create({
      data: {
        providerId: providerRow!.id,
        name: 'Svc',
        description: 'D',
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

    const booking = await api(app).asBearer(userToken).post('/bookings').send({ timeSlotId })
    expect(booking.status).toBe(200)
    bookingId = booking.body.booking.id as string
  })

  afterAll(async () => {
    await app?.close()
    await cleanup?.()
  })

  it('GET /provider/time-slots/:timeSlotId/bookings returns { items }', async () => {
    const res = await api(app)
      .asBearer(providerToken)
      .get(`/provider/time-slots/${timeSlotId}/bookings`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(res.body.items[0]).toHaveProperty('id')
  })

  it('POST /provider/bookings/:bookingId/complete returns { booking }', async () => {
    const res = await api(app)
      .asBearer(providerToken)
      .post(`/provider/bookings/${bookingId}/complete`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('booking')
    expect(res.body.booking).toMatchObject({ id: bookingId, status: 'COMPLETED' })
  })

  it('POST /provider/bookings/:bookingId/cancel returns { booking }', async () => {
    // create another booking to cancel (this suite already completed one above)
    const prisma = createPrismaTestClient(databaseUrl)
    const userRow = await prisma.user.findFirst({ where: { role: 'USER' } })
    expect(userRow).toBeTruthy()

    const start = new Date(Date.now() + 3 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const service = await prisma.service.findFirst({ where: { name: 'Svc' } })
    expect(service).toBeTruthy()

    const newSlot = await prisma.timeSlot.create({
      data: {
        serviceId: service!.id,
        startTime: start,
        endTime: end,
        capacity: 1,
        bookedCount: 0,
        status: 'OPEN',
        cancelDeadlineAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    })

    await prisma.booking.create({
      data: {
        userId: userRow!.id,
        timeSlotId: newSlot.id,
        status: 'CONFIRMED',
      },
    })

    await prisma.timeSlot.update({ where: { id: newSlot.id }, data: { bookedCount: 1 } })
    await prisma.$disconnect()

    const prisma2 = createPrismaTestClient(databaseUrl)
    const bookingRow = await prisma2.booking.findFirst({ where: { timeSlotId: newSlot.id } })
    await prisma2.$disconnect()
    expect(bookingRow).toBeTruthy()

    const res = await api(app)
      .asBearer(providerToken)
      .post(`/provider/bookings/${bookingRow!.id}/cancel`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('booking')
    expect(res.body.booking).toMatchObject({ id: bookingRow!.id, status: 'CANCELLED' })
  })
})
