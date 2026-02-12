import * as request from 'supertest'
import { createTestApp, createTestDb } from '../test-utils'

describe('US1 create ticket', () => {
  it('CreateTicket creates initial message and audit logs', async () => {
    const db = await createTestDb()
    const testApp = await createTestApp({ databaseUrl: db.url })

    try {
      const email = 'customer2@example.com'
      const password = 'password123'

      const registerRes = await request(testApp.app.getHttpServer())
        .post('/auth/register')
        .send({ email, password, password_confirm: password })
        .expect(200)

      const token = registerRes.body.token as string

      const createRes = await request(testApp.app.getHttpServer())
        .post('/tickets')
        .set('authorization', `Bearer ${token}`)
        .send({
          title: 'Need help',
          category: 'Technical',
          description: 'My laptop is on fire',
        })
        .expect(200)

      const ticketId = createRes.body.ticket.id as string
      expect(ticketId).toBeTruthy()
      expect(createRes.body.ticket.messages).toHaveLength(1)
      expect(createRes.body.ticket.messages[0]).toMatchObject({
        content: 'My laptop is on fire',
        is_internal: false,
        role: 'Customer',
      })

      const ticketAudit = await db.prisma.auditLog.findMany({
        where: { entityType: 'Ticket', entityId: ticketId },
      })
      expect(ticketAudit.length).toBeGreaterThanOrEqual(1)

      const messageId = createRes.body.ticket.messages[0].id as string
      const messageAudit = await db.prisma.auditLog.findMany({
        where: { entityType: 'TicketMessage', entityId: messageId },
      })
      expect(messageAudit.length).toBeGreaterThanOrEqual(1)
    } finally {
      await testApp.close()
      await db.cleanup()
    }
  })
})
