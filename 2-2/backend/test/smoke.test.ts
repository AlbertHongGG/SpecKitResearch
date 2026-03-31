import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { createTestApp } from './utils/create-test-app'
import { createTestDb } from './utils/test-db'

describe('smoke', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined

  beforeAll(async () => {
    const testDb = await createTestDb()
    cleanup = testDb.cleanup
    app = await createTestApp({ databaseUrl: testDb.databaseUrl })
  })

  afterAll(async () => {
    await app.close()
    await cleanup?.()
  })

  it('GET / returns Hello World and request id header', async () => {
    const res = await (await import('supertest')).default(app.getHttpServer()).get('/')
    if (res.status !== 200) {
      console.error('Unexpected response', { status: res.status, text: res.text, body: res.body })
    }
    expect(res.status).toBe(200)
    expect(res.text).toBe('Hello World!')
    expect(res.headers['x-request-id']).toBeTruthy()
  })
})
