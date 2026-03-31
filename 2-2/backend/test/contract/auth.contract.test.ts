import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'
import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'

describe('Auth contract', () => {
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

  it('POST /auth/register returns AuthResponse', async () => {
    const email = `user-${Date.now()}@example.com`
    const res = await api(app)
      .post('/auth/register')
      .send({ email, password: 'P@ssw0rd123!', role: 'USER' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
    expect(typeof res.body.accessToken).toBe('string')
    expect(res.body).toHaveProperty('expiresAt')
    expect(typeof res.body.expiresAt).toBe('string')
    expect(res.body).toHaveProperty('user')
    expect(res.body.user).toMatchObject({ email, role: 'USER', status: 'ACTIVE' })
  })

  it('POST /auth/login returns AuthResponse', async () => {
    const email = `user-${Date.now()}@example.com`
    await api(app).post('/auth/register').send({ email, password: 'P@ssw0rd123!', role: 'USER' })

    const res = await api(app).post('/auth/login').send({ email, password: 'P@ssw0rd123!' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
    expect(typeof res.body.accessToken).toBe('string')
    expect(res.body).toHaveProperty('expiresAt')
    expect(typeof res.body.expiresAt).toBe('string')
    expect(res.body.user).toMatchObject({ email, role: 'USER', status: 'ACTIVE' })
  })

  it('POST /auth/register with duplicate email returns 409', async () => {
    const email = `dup-${Date.now()}@example.com`
    await api(app).post('/auth/register').send({ email, password: 'P@ssw0rd123!', role: 'USER' })

    const res = await api(app)
      .post('/auth/register')
      .send({ email, password: 'P@ssw0rd123!', role: 'USER' })
    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('code')
    expect(res.body).toHaveProperty('message')
    expect(res.body).toHaveProperty('requestId')
  })
})
