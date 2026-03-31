import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import bcrypt from 'bcrypt'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { createPrismaTestClient } from '../utils/prisma-test-client'

describe('US3 integration: suspended after login', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let adminEmail: string
  let adminPassword: string
  let userEmail: string
  let userPassword: string
  let userId: string

  beforeAll(async () => {
    const testDb = await createTestDb()
    cleanup = testDb.cleanup
    migrateDatabase(testDb.databaseUrl)
    app = await createTestApp({ databaseUrl: testDb.databaseUrl })

    const prisma = createPrismaTestClient(testDb.databaseUrl)

    adminEmail = `admin-${Date.now()}@example.com`
    adminPassword = 'admin1234'
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    })

    userEmail = `user-${Date.now()}@example.com`
    userPassword = 'user1234'
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash: await bcrypt.hash(userPassword, 10),
        role: 'USER',
        status: 'ACTIVE',
      },
    })
    userId = user.id

    await prisma.$disconnect()
  })

  afterAll(async () => {
    await app?.close()
    await cleanup?.()
  })

  it('suspending a user invalidates protected requests even with old token', async () => {
    const adminLogin = await api(app)
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
    expect(adminLogin.status).toBe(200)
    const adminToken = adminLogin.body.accessToken as string

    const userLogin = await api(app)
      .post('/auth/login')
      .send({ email: userEmail, password: userPassword })
    expect(userLogin.status).toBe(200)
    const userToken = userLogin.body.accessToken as string

    // Verify user token works before suspension
    const okRes = await api(app).asBearer(userToken).get('/me/bookings')
    expect(okRes.status).toBe(200)

    // Suspend user via admin API
    const suspendRes = await api(app)
      .asBearer(adminToken)
      .patch(`/admin/users/${userId}`)
      .send({ status: 'SUSPENDED' })
    expect(suspendRes.status).toBe(200)

    // Same token should now be treated as unauthorized
    const deniedRes = await api(app).asBearer(userToken).get('/me/bookings')
    expect(deniedRes.status).toBe(401)
  })
})
