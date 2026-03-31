import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { ErrorCodes } from '../../src/common/errors/error-codes'

describe('US2 integration: provider ownership enforcement', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined

  beforeAll(async () => {
    const testDb = await createTestDb()
    cleanup = testDb.cleanup
    migrateDatabase(testDb.databaseUrl)
    app = await createTestApp({ databaseUrl: testDb.databaseUrl })
  })

  afterAll(async () => {
    await app?.close()
    await cleanup?.()
  })

  it("provider cannot operate on another provider's service/time slot/booking", async () => {
    const p1 = await api(app)
      .post('/auth/register')
      .send({ email: `p1-${Date.now()}@example.com`, password: 'P@ssw0rd123!', role: 'PROVIDER' })
    const p2 = await api(app)
      .post('/auth/register')
      .send({ email: `p2-${Date.now()}@example.com`, password: 'P@ssw0rd123!', role: 'PROVIDER' })
    expect(p1.status).toBe(200)
    expect(p2.status).toBe(200)

    const p1Token = p1.body.accessToken as string
    const p2Token = p2.body.accessToken as string

    const service = await api(app)
      .asBearer(p1Token)
      .post('/provider/services')
      .send({ name: 'Svc', description: 'D', durationMinutes: 60 })
    expect(service.status).toBe(200)
    const serviceId = service.body.service.id as string

    const start = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const slot = await api(app)
      .asBearer(p1Token)
      .post(`/provider/services/${serviceId}/time-slots`)
      .send({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        capacity: 1,
        cancelDeadlineAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    expect(slot.status).toBe(200)
    const timeSlotId = slot.body.timeSlot.id as string

    const user = await api(app)
      .post('/auth/register')
      .send({ email: `user-${Date.now()}@example.com`, password: 'P@ssw0rd123!', role: 'USER' })
    expect(user.status).toBe(200)
    const booking = await api(app)
      .asBearer(user.body.accessToken as string)
      .post('/bookings')
      .send({ timeSlotId })
    expect(booking.status).toBe(200)
    const bookingId = booking.body.booking.id as string

    const forbiddenServicePatch = await api(app)
      .asBearer(p2Token)
      .patch(`/provider/services/${serviceId}`)
      .send({ name: 'Hacked' })
    expect(forbiddenServicePatch.status).toBe(404)
    expect(forbiddenServicePatch.body.code).toBe(ErrorCodes.NOT_FOUND)

    const forbiddenSlotBookings = await api(app)
      .asBearer(p2Token)
      .get(`/provider/time-slots/${timeSlotId}/bookings`)
    expect(forbiddenSlotBookings.status).toBe(404)
    expect(forbiddenSlotBookings.body.code).toBe(ErrorCodes.NOT_FOUND)

    const forbiddenBookingComplete = await api(app)
      .asBearer(p2Token)
      .post(`/provider/bookings/${bookingId}/complete`)
    expect(forbiddenBookingComplete.status).toBe(404)
    expect(forbiddenBookingComplete.body.code).toBe(ErrorCodes.NOT_FOUND)
  })
})
