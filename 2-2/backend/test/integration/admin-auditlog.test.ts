import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import bcrypt from 'bcrypt'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { createPrismaTestClient } from '../utils/prisma-test-client'

describe('US3 integration: admin audit log', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let databaseUrl: string
  let adminToken: string
  let targetUserId: string

  beforeAll(async () => {
    const testDb = await createTestDb()
    cleanup = testDb.cleanup
    databaseUrl = testDb.databaseUrl
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

  it('writes AuditLog when admin updates user status', async () => {
    const patchRes = await api(app)
      .asBearer(adminToken)
      .patch(`/admin/users/${targetUserId}`)
      .send({ status: 'SUSPENDED' })
    expect(patchRes.status).toBe(200)

    const prisma = createPrismaTestClient(databaseUrl)
    const log = await prisma.auditLog.findFirst({
      where: { targetType: 'User', targetId: targetUserId, action: 'ADMIN_USER_STATUS_UPDATE' },
    })

    expect(log).toBeTruthy()
    await prisma.$disconnect()
  })
})
