import * as request from 'supertest'
import { createTestApp, createTestDb } from '../test-utils'
import { hashPassword } from '../../src/modules/auth/password.util'

describe('US3 admin assign', () => {
  it('assign/reassign writes audit and updates visibility', async () => {
    const db = await createTestDb()
    const testApp = await createTestApp({ databaseUrl: db.url })

    try {
      const adminEmail = 'admin-assign@example.com'
      const adminPassword = 'password123'
      const agentEmail = 'agent-assign@example.com'
      const agentPassword = 'password123'
      const customerEmail = 'customer-assign@example.com'

      const [admin, agent, customer] = await Promise.all([
        db.prisma.user.create({
          data: { email: adminEmail, passwordHash: await hashPassword(adminPassword), role: 'Admin', isActive: true },
          select: { id: true },
        }),
        db.prisma.user.create({
          data: { email: agentEmail, passwordHash: await hashPassword(agentPassword), role: 'Agent', isActive: true },
          select: { id: true },
        }),
        db.prisma.user.create({
          data: { email: customerEmail, passwordHash: await hashPassword('password123'), role: 'Customer', isActive: true },
          select: { id: true },
        }),
      ])

      const ticket = await db.prisma.ticket.create({
        data: { title: 'needs help', category: 'Other', status: 'Open', customerId: customer.id, assigneeId: null },
        select: { id: true },
      })

      const adminLogin = await request(testApp.app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password: adminPassword })
        .expect(200)

      const agentLogin = await request(testApp.app.getHttpServer())
        .post('/auth/login')
        .send({ email: agentEmail, password: agentPassword })
        .expect(200)

      const adminToken = adminLogin.body.token as string
      const agentToken = agentLogin.body.token as string

      await request(testApp.app.getHttpServer())
        .put(`/admin/tickets/${ticket.id}/assignee`)
        .set('authorization', `Bearer ${adminToken}`)
        .send({ assignee_id: agent.id })
        .expect(200)

      const latestTicket = await db.prisma.ticket.findUnique({
        where: { id: ticket.id },
        select: { status: true, assigneeId: true },
      })

      expect(latestTicket?.assigneeId).toBe(agent.id)
      expect(latestTicket?.status).toBe('InProgress')

      const audits = await db.prisma.auditLog.findMany({
        where: { entityType: 'Ticket', entityId: ticket.id },
        orderBy: { createdAt: 'asc' },
        select: { action: true },
      })

      expect(audits.some((a) => a.action === 'ASSIGNEE_CHANGED')).toBe(true)
      expect(audits.some((a) => a.action === 'STATUS_CHANGED')).toBe(true)

      // Agent can now see ticket details.
      const detailRes = await request(testApp.app.getHttpServer())
        .get(`/tickets/${ticket.id}`)
        .set('authorization', `Bearer ${agentToken}`)
        .expect(200)

      expect(detailRes.body.ticket).toMatchObject({
        id: ticket.id,
        status: 'In Progress',
      })
      expect(detailRes.body.ticket.assignee).toMatchObject({ id: agent.id, role: 'Agent' })

      // Ticket appears in agent workspace mine view.
      const mineRes = await request(testApp.app.getHttpServer())
        .get('/agent/tickets')
        .query({ view: 'mine' })
        .set('authorization', `Bearer ${agentToken}`)
        .expect(200)

      expect(mineRes.body.items.some((t: any) => t.id === ticket.id)).toBe(true)

      // Reassign (unassign) moves ticket back to Open/unassigned.
      await request(testApp.app.getHttpServer())
        .put(`/admin/tickets/${ticket.id}/assignee`)
        .set('authorization', `Bearer ${adminToken}`)
        .send({ assignee_id: null })
        .expect(200)

      const afterUnassign = await db.prisma.ticket.findUnique({
        where: { id: ticket.id },
        select: { status: true, assigneeId: true },
      })

      expect(afterUnassign?.assigneeId).toBeNull()
      expect(afterUnassign?.status).toBe('Open')
    } finally {
      await testApp.close()
      await db.cleanup()
    }
  })
})
