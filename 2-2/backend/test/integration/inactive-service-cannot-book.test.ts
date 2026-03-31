import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import bcrypt from 'bcrypt'

import { api } from '../utils/http'
import { createTestApp } from '../utils/create-test-app'
import { createTestDb } from '../utils/test-db'
import { migrateDatabase } from '../utils/migrate-db'
import { createPrismaTestClient } from '../utils/prisma-test-client'

describe('US3 integration: inactive service cannot be booked', () => {
  let app: INestApplication
  let cleanup: (() => Promise<void>) | undefined
  let adminToken: string
  let userToken: string
  let serviceId: string
  let timeSlotId: string

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

    const userEmail = `user-${Date.now()}@example.com`
    const userPassword = 'user1234'
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash: await bcrypt.hash(userPassword, 10),
        role: 'USER',
        status: 'ACTIVE',
      },
    })

    const service = await prisma.service.create({
      data: {
        providerId: provider.id,
        name: 'Bookable',
        description: 'Desc',
        durationMinutes: 30,
        status: 'ACTIVE',
      },
    })
    serviceId = service.id

    const start = new Date(Date.now() + 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const slot = await prisma.timeSlot.create({
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
    timeSlotId = slot.id

    const adminLogin = await api(app)
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
    expect(adminLogin.status).toBe(200)
    adminToken = adminLogin.body.accessToken as string

    const userLogin = await api(app)
      .post('/auth/login')
      .send({ email: userEmail, password: userPassword })
    expect(userLogin.status).toBe(200)
    userToken = userLogin.body.accessToken as string

    await prisma.$disconnect()
  })

  afterAll(async () => {
    await app?.close()
    await cleanup?.()
  })

  it('booking is rejected when service is INACTIVE', async () => {
    const patchRes = await api(app)
      .asBearer(adminToken)
      .patch(`/admin/services/${serviceId}`)
      .send({ status: 'INACTIVE' })
    expect(patchRes.status).toBe(200)

    const res = await api(app).asBearer(userToken).post('/bookings').send({ timeSlotId })
    expect(res.status).toBe(409)
  })
})
