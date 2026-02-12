import * as request from 'supertest'
import { createTestApp, createTestDb } from '../test-utils'
import { hashPassword } from '../../src/modules/auth/password.util'

describe('US2 cancel_take', () => {
  it('assignee agent can cancel take: In Progress -> Open and unassigned', async () => {
    const db = await createTestDb()
    const testApp = await createTestApp({ databaseUrl: db.url })

    try {
      const password = 'password123'

      const customer = await db.prisma.user.create({
        data: {
          email: 'cust_cancel@example.com',
          passwordHash: await hashPassword(password),
          role: 'Customer',
          isActive: true,
        },
        select: { id: true },
      })

      const agent = await db.prisma.user.create({
        data: {
          email: 'agent_cancel@example.com',
          passwordHash: await hashPassword(password),
          role: 'Agent',
          isActive: true,
        },
        select: { id: true },
      })

      const ticket = await db.prisma.ticket.create({
        data: {
          title: 'Cancel take',
          category: 'Other',
          status: 'InProgress',
          customerId: customer.id,
          assigneeId: agent.id,
          closedAt: null,
        },
        select: { id: true },
      })

      const login = await request(testApp.app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'agent_cancel@example.com', password })
        .expect(200)

      const token = login.body.token as string

      const res = await request(testApp.app.getHttpServer())
        .post(`/tickets/${ticket.id}/cancel-take`)
        .set('authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.ticket.status).toBe('Open')
      expect(res.body.ticket.assignee_id).toBeNull()

      const dbTicket = await db.prisma.ticket.findUnique({ where: { id: ticket.id } })
      expect(dbTicket?.status).toBe('Open')
      expect(dbTicket?.assigneeId).toBeNull()

      // invalid: cannot cancel if not In Progress
      const ticket2 = await db.prisma.ticket.create({
        data: {
          title: 'Invalid cancel',
          category: 'Other',
          status: 'Open',
          customerId: customer.id,
          assigneeId: agent.id,
          closedAt: null,
        },
        select: { id: true },
      })

      await request(testApp.app.getHttpServer())
        .post(`/tickets/${ticket2.id}/cancel-take`)
        .set('authorization', `Bearer ${token}`)
        .expect(400)
    } finally {
      await testApp.close()
      await db.cleanup()
    }
  })
})
