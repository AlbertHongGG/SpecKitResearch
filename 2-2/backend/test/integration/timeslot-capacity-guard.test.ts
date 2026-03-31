import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { ErrorCodes } from '../../src/common/errors/error-codes'

describe('US2 integration: time slot capacity cannot go below bookedCount', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let providerToken: string
  let serviceId: string
  let timeSlotId: string

  beforeAll(async () => {
    const testDb = await createTestDb()
    cleanup = testDb.cleanup
    migrateDatabase(testDb.databaseUrl)
    app = await createTestApp({ databaseUrl: testDb.databaseUrl })

    const reg = await api(app)
      .post('/auth/register')
      .send({
        email: `provider-${Date.now()}@example.com`,
        password: 'P@ssw0rd123!',
        role: 'PROVIDER',
      })
    expect(reg.status).toBe(200)
    providerToken = reg.body.accessToken as string

    const service = await api(app)
      .asBearer(providerToken)
      .post('/provider/services')
      .send({ name: 'Svc', description: 'D', durationMinutes: 60 })
    expect(service.status).toBe(200)
    serviceId = service.body.service.id as string

    const start = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)

    const slot = await api(app)
      .asBearer(providerToken)
      .post(`/provider/services/${serviceId}/time-slots`)
      .send({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        capacity: 2,
        cancelDeadlineAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    expect(slot.status).toBe(200)
    timeSlotId = slot.body.timeSlot.id as string

    const userEmail = `user-${Date.now()}@example.com`
    const user = await api(app)
      .post('/auth/register')
      .send({ email: userEmail, password: 'P@ssw0rd123!', role: 'USER' })
    expect(user.status).toBe(200)
    const userToken = user.body.accessToken as string

    const user2Email = `user2-${Date.now()}@example.com`
    const user2 = await api(app)
      .post('/auth/register')
      .send({ email: user2Email, password: 'P@ssw0rd123!', role: 'USER' })
    expect(user2.status).toBe(200)
    const user2Token = user2.body.accessToken as string

    const booking = await api(app).asBearer(userToken).post('/bookings').send({ timeSlotId })
    expect(booking.status).toBe(200)

    const booking2 = await api(app).asBearer(user2Token).post('/bookings').send({ timeSlotId })
    expect(booking2.status).toBe(200)
  })

  afterAll(async () => {
    await app?.close()
    await cleanup?.()
  })

  it('rejects capacity reduction below bookedCount', async () => {
    const res = await api(app)
      .asBearer(providerToken)
      .patch(`/provider/time-slots/${timeSlotId}`)
      .send({ capacity: 0 })

    expect(res.status).toBe(400)

    const res2 = await api(app)
      .asBearer(providerToken)
      .patch(`/provider/time-slots/${timeSlotId}`)
      .send({ capacity: 1 })

    expect(res2.status).toBe(409)
    expect(res2.body.code).toBe(ErrorCodes.CONFLICT)
  })
})
