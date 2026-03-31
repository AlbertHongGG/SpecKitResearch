import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'
import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'

describe('Provider time slots contract', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let providerToken: string
  let serviceId: string

  beforeAll(async () => {
    const testDb = await createTestDb()
    cleanup = testDb.cleanup
    migrateDatabase(testDb.databaseUrl)
    app = await createTestApp({ databaseUrl: testDb.databaseUrl })

    const email = `provider-${Date.now()}@example.com`
    const reg = await api(app)
      .post('/auth/register')
      .send({ email, password: 'P@ssw0rd123!', role: 'PROVIDER' })
    expect(reg.status).toBe(200)
    providerToken = reg.body.accessToken as string

    const service = await api(app)
      .asBearer(providerToken)
      .post('/provider/services')
      .send({ name: 'Svc', description: 'D', durationMinutes: 60 })
    expect(service.status).toBe(200)
    serviceId = service.body.service.id as string
  })

  afterAll(async () => {
    await app?.close()
    await cleanup?.()
  })

  it('POST /provider/services/:serviceId/time-slots returns { timeSlot }', async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const cancelDeadlineAt = new Date(Date.now() + 30 * 60 * 1000)

    const res = await api(app)
      .asBearer(providerToken)
      .post(`/provider/services/${serviceId}/time-slots`)
      .send({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        capacity: 3,
        cancelDeadlineAt: cancelDeadlineAt.toISOString(),
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('timeSlot')
    expect(res.body.timeSlot).toHaveProperty('id')
    expect(res.body.timeSlot).toMatchObject({
      serviceId,
      capacity: 3,
      bookedCount: 0,
      status: 'OPEN',
    })
    expect(res.body.timeSlot).toHaveProperty('remainingCapacity')
    expect(res.body.timeSlot.remainingCapacity).toBe(3)
  })

  it('PATCH /provider/time-slots/:timeSlotId returns { timeSlot }', async () => {
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const cancelDeadlineAt = new Date(Date.now() + 90 * 60 * 1000)

    const created = await api(app)
      .asBearer(providerToken)
      .post(`/provider/services/${serviceId}/time-slots`)
      .send({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        capacity: 2,
        cancelDeadlineAt: cancelDeadlineAt.toISOString(),
      })
    expect(created.status).toBe(200)
    const timeSlotId = created.body.timeSlot.id as string

    const res = await api(app)
      .asBearer(providerToken)
      .patch(`/provider/time-slots/${timeSlotId}`)
      .send({ capacity: 5, status: 'CLOSED' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('timeSlot')
    expect(res.body.timeSlot).toMatchObject({ id: timeSlotId, capacity: 5, status: 'CLOSED' })
    expect(res.body.timeSlot.remainingCapacity).toBeGreaterThanOrEqual(0)
  })
})
