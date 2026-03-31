import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import bcrypt from 'bcrypt'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { createPrismaTestClient } from '../utils/prisma-test-client'

describe('Admin services contract', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let adminToken: string
  let serviceId: string

  beforeAll(async () => {
    const testDb = await createTestDb()
    cleanup = testDb.cleanup
    migrateDatabase(testDb.databaseUrl)
    app = await createTestApp({ databaseUrl: testDb.databaseUrl })

    const prisma = createPrismaTestClient(testDb.databaseUrl)

    const adminEmail = `admin-${Date.now()}@example.com`
    const adminPassword = 'admin1234'
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    })

    const provider = await prisma.user.create({
      data: {
        email: `provider-${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash('provider1234', 10),
        role: 'PROVIDER',
        status: 'ACTIVE',
      },
    })

    const service = await prisma.service.create({
      data: {
        providerId: provider.id,
        name: 'Admin Managed',
        description: 'Desc',
        durationMinutes: 30,
        status: 'ACTIVE',
      },
    })

    serviceId = service.id

    const login = await api(app)
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
    expect(login.status).toBe(200)
    adminToken = login.body.accessToken as string

    await prisma.$disconnect()
  })

  afterAll(async () => {
    await app?.close()
    await cleanup?.()
  })

  it('GET /admin/services returns { items }', async () => {
    const res = await api(app).asBearer(adminToken).get('/admin/services')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  it('PATCH /admin/services/:serviceId returns { service }', async () => {
    const res = await api(app)
      .asBearer(adminToken)
      .patch(`/admin/services/${serviceId}`)
      .send({ status: 'INACTIVE' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('service')
    expect(res.body.service).toMatchObject({ id: serviceId, status: 'INACTIVE' })
  })
})
