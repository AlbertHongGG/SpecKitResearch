import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import bcrypt from 'bcrypt'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { createPrismaTestClient } from '../utils/prisma-test-client'

describe('Admin users contract', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let adminToken: string
  let targetUserId: string

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

    const user = await prisma.user.create({
      data: {
        email: `user-${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash('user1234', 10),
        role: 'USER',
        status: 'ACTIVE',
      },
    })
    targetUserId = user.id

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

  it('GET /admin/users returns { items }', async () => {
    const res = await api(app).asBearer(adminToken).get('/admin/users')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  it('PATCH /admin/users/:userId returns { user }', async () => {
    const res = await api(app)
      .asBearer(adminToken)
      .patch(`/admin/users/${targetUserId}`)
      .send({ status: 'SUSPENDED' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('user')
    expect(res.body.user).toMatchObject({ id: targetUserId, status: 'SUSPENDED' })
  })
})
