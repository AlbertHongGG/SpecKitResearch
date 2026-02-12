import * as request from 'supertest'
import { createTestApp, createTestDb } from '../test-utils'
import { hashPassword } from '../../src/modules/auth/password.util'

describe('US2 take concurrency', () => {
  it('at most one agent can take the same Open ticket; others get 409', async () => {
    const db = await createTestDb()
    const testApp = await createTestApp({ databaseUrl: db.url })

    try {
      const password = 'password123'

      const customer = await db.prisma.user.create({
        data: {
          email: 'cust_take@example.com',
          passwordHash: await hashPassword(password),
          role: 'Customer',
          isActive: true,
        },
        select: { id: true },
      })

      const ticket = await db.prisma.ticket.create({
        data: {
          title: 'Take me',
          category: 'Other',
          status: 'Open',
          customerId: customer.id,
          assigneeId: null,
          closedAt: null,
        },
        select: { id: true },
      })

      await db.prisma.user.create({
        data: {
          email: 'agent_a@example.com',
          passwordHash: await hashPassword(password),
          role: 'Agent',
          isActive: true,
        },
      })

      await db.prisma.user.create({
        data: {
          email: 'agent_b@example.com',
          passwordHash: await hashPassword(password),
          role: 'Agent',
          isActive: true,
        },
      })

      const loginA = await request(testApp.app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'agent_a@example.com', password })
        .expect(200)

      const loginB = await request(testApp.app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'agent_b@example.com', password })
        .expect(200)

      const tokenA = loginA.body.token as string
      const tokenB = loginB.body.token as string

      const [resA, resB] = await Promise.all([
        request(testApp.app.getHttpServer())
          .post(`/tickets/${ticket.id}/take`)
          .set('authorization', `Bearer ${tokenA}`),
        request(testApp.app.getHttpServer())
          .post(`/tickets/${ticket.id}/take`)
          .set('authorization', `Bearer ${tokenB}`),
      ])

      const statuses = [resA.status, resB.status].sort()
      expect(statuses).toEqual([200, 409])

      const dbTicket = await db.prisma.ticket.findUnique({ where: { id: ticket.id } })
      expect(dbTicket?.status).toBe('InProgress')
      expect(dbTicket?.assigneeId).toBeTruthy()
    } finally {
      await testApp.close()
      await db.cleanup()
    }
  })
})
