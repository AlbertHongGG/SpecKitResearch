import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { INestApplication } from '@nestjs/common'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import bcrypt from 'bcrypt'
import { createPrismaTestClient } from '../utils/prisma-test-client'

describe('Public contract', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let serviceId: string

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
    serviceId = service.id

    const start = new Date(Date.now() + 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    await prisma.timeSlot.create({
      data: {
        serviceId: service.id,
        startTime: start,
        endTime: end,
        capacity: 2,
        bookedCount: 0,
        status: 'OPEN',
        cancelDeadlineAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })

    await prisma.$disconnect()
  })

  afterAll(async () => {
    await app?.close()
    await cleanup?.()
  })

  it('GET /services returns { items: Service[] }', async () => {
    const res = await api(app).get('/services')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(res.body.items.length).toBeGreaterThan(0)
  })

  it('GET /services/{serviceId} returns { service, timeSlots }', async () => {
    const res = await api(app).get(`/services/${serviceId}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('service')
    expect(res.body).toHaveProperty('timeSlots')
    expect(Array.isArray(res.body.timeSlots)).toBe(true)

    if (res.body.timeSlots.length > 0) {
      expect(res.body.timeSlots[0]).toHaveProperty('remainingCapacity')
      expect(typeof res.body.timeSlots[0].remainingCapacity).toBe('number')
    }
  })
})
