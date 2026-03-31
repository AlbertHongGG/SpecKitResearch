import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { ErrorCodes } from '../../src/common/errors/error-codes'

describe('US2 integration: time slot overlap rule', () => {
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

  it('rejects overlapping time slots under the same service', async () => {
    const start1 = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const end1 = new Date(start1.getTime() + 60 * 60 * 1000)

    const create1 = await api(app)
      .asBearer(providerToken)
      .post(`/provider/services/${serviceId}/time-slots`)
      .send({
        startTime: start1.toISOString(),
        endTime: end1.toISOString(),
        capacity: 2,
        cancelDeadlineAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    expect(create1.status).toBe(200)

    const start2 = new Date(start1.getTime() + 30 * 60 * 1000)
    const end2 = new Date(start2.getTime() + 60 * 60 * 1000)

    const create2 = await api(app)
      .asBearer(providerToken)
      .post(`/provider/services/${serviceId}/time-slots`)
      .send({
        startTime: start2.toISOString(),
        endTime: end2.toISOString(),
        capacity: 2,
        cancelDeadlineAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })

    expect(create2.status).toBe(409)
    expect(create2.body.code).toBe(ErrorCodes.CONFLICT)
  })
})
