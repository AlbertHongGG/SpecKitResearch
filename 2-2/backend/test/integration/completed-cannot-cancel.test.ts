import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { ErrorCodes } from '../../src/common/errors/error-codes'

describe('US2 integration: completed bookings cannot be cancelled by user', () => {
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

  it('user cancel after provider completes is rejected', async () => {
    const provider = await api(app)
      .post('/auth/register')
      .send({
        email: `provider-${Date.now()}@example.com`,
        password: 'P@ssw0rd123!',
        role: 'PROVIDER',
      })
    expect(provider.status).toBe(200)
    const providerToken = provider.body.accessToken as string

    const service = await api(app)
      .asBearer(providerToken)
      .post('/provider/services')
      .send({ name: 'Svc', description: 'D', durationMinutes: 60 })
    expect(service.status).toBe(200)

    const start = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const slot = await api(app)
      .asBearer(providerToken)
      .post(`/provider/services/${service.body.service.id}/time-slots`)
      .send({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        capacity: 1,
        cancelDeadlineAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    expect(slot.status).toBe(200)

    const user = await api(app)
      .post('/auth/register')
      .send({ email: `user-${Date.now()}@example.com`, password: 'P@ssw0rd123!', role: 'USER' })
    expect(user.status).toBe(200)
    const userToken = user.body.accessToken as string

    const booking = await api(app)
      .asBearer(userToken)
      .post('/bookings')
      .send({ timeSlotId: slot.body.timeSlot.id })
    expect(booking.status).toBe(200)

    const complete = await api(app)
      .asBearer(providerToken)
      .post(`/provider/bookings/${booking.body.booking.id}/complete`)
    expect(complete.status).toBe(200)

    const cancel = await api(app)
      .asBearer(userToken)
      .post(`/bookings/${booking.body.booking.id}/cancel`)

    expect(cancel.status).toBe(409)
    expect(cancel.body.code).toBe(ErrorCodes.INVALID_TRANSITION)
  })
})
