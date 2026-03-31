import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import bcrypt from 'bcrypt'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { createPrismaTestClient } from '../utils/prisma-test-client'

describe('Admin reports contract', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let adminToken: string

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

  it('GET /admin/reports/summary returns AdminSummaryReport', async () => {
    const res = await api(app).asBearer(adminToken).get('/admin/reports/summary')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalBookings')
    expect(res.body).toHaveProperty('cancellationRate')
    expect(res.body).toHaveProperty('activeServicesCount')
    expect(res.body).toHaveProperty('activeProvidersCount')
  })
})
