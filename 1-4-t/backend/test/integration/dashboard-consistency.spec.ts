import * as request from 'supertest'
import { createTestApp, createTestDb } from '../test-utils'
import { hashPassword } from '../../src/modules/auth/password.util'

describe('US3 dashboard consistency', () => {
  it('status_distribution sum equals tickets count (range=last_7_days)', async () => {
    const db = await createTestDb()
    const testApp = await createTestApp({ databaseUrl: db.url })

    try {
      const adminEmail = 'admin1@example.com'
      const adminPassword = 'password123'
      const customerEmail = 'customer-dashboard@example.com'

      const admin = await db.prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: await hashPassword(adminPassword),
          role: 'Admin',
          isActive: true,
        },
        select: { id: true },
      })

      const customer = await db.prisma.user.create({
        data: {
          email: customerEmail,
          passwordHash: await hashPassword('password123'),
          role: 'Customer',
          isActive: true,
        },
        select: { id: true },
      })

      await db.prisma.ticket.createMany({
        data: [
          { title: 't1', category: 'Other', status: 'Open', customerId: customer.id, assigneeId: null },
          { title: 't2', category: 'Other', status: 'Resolved', customerId: customer.id, assigneeId: null },
          { title: 't3', category: 'Other', status: 'Closed', customerId: customer.id, assigneeId: null, closedAt: new Date() },
        ],
      })

      const loginRes = await request(testApp.app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password: adminPassword })
        .expect(200)

      const token = loginRes.body.token as string

      const res = await request(testApp.app.getHttpServer())
        .get('/admin/dashboard')
        .query({ range: 'last_7_days' })
        .set('authorization', `Bearer ${token}`)
        .expect(200)

      const dist = res.body.status_distribution as Record<string, number>
      const sum = Object.values(dist).reduce((a, b) => a + b, 0)

      expect(sum).toBe(3)
      expect(res.body.sla).toBeTruthy()
      expect(Array.isArray(res.body.agent_load)).toBe(true)

      // Ensure admin user isn't accidentally used as ticket customer.
      expect(admin.id).not.toBe(customer.id)
    } finally {
      await testApp.close()
      await db.cleanup()
    }
  })
})
