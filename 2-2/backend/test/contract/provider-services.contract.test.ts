import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'
import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'

describe('Provider services contract', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let providerToken: string

  beforeAll(async () => {
    const testDb = await createTestDb()
    cleanup = testDb.cleanup
    migrateDatabase(testDb.databaseUrl)
    app = await createTestApp({ databaseUrl: testDb.databaseUrl })

    const email = `provider-${Date.now()}@example.com`
    const res = await api(app)
      .post('/auth/register')
      .send({ email, password: 'P@ssw0rd123!', role: 'PROVIDER' })
    expect(res.status).toBe(200)
    providerToken = res.body.accessToken as string
  })

  afterAll(async () => {
    await app?.close()
    await cleanup?.()
  })

  it('POST /provider/services returns { service }', async () => {
    const res = await api(app)
      .asBearer(providerToken)
      .post('/provider/services')
      .send({ name: 'My Service', description: 'Desc', durationMinutes: 60 })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('service')
    expect(res.body.service).toHaveProperty('id')
    expect(res.body.service).toMatchObject({
      name: 'My Service',
      description: 'Desc',
      durationMinutes: 60,
    })
  })

  it('PATCH /provider/services/:serviceId returns { service }', async () => {
    const created = await api(app)
      .asBearer(providerToken)
      .post('/provider/services')
      .send({ name: 'Editable', description: 'Desc', durationMinutes: 30 })
    expect(created.status).toBe(200)
    const serviceId = created.body.service.id as string

    const res = await api(app)
      .asBearer(providerToken)
      .patch(`/provider/services/${serviceId}`)
      .send({ name: 'Edited', status: 'INACTIVE' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('service')
    expect(res.body.service).toMatchObject({ id: serviceId, name: 'Edited', status: 'INACTIVE' })
  })
})
