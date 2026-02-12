import * as request from 'supertest'
import { createTestApp, createTestDb } from '../test-utils'

describe('US1 customer reply transition', () => {
  it('Customer can only reply when Waiting for Customer; success sets status back to In Progress', async () => {
    const db = await createTestDb()
    const testApp = await createTestApp({ databaseUrl: db.url })

    try {
      const email = 'customer3@example.com'
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
          title: 'Waiting test',
          category: 'Other',
          description: 'Initial',
        })
        .expect(200)

      const ticketId = createRes.body.ticket.id as string

      await db.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'WaitingForCustomer' },
      })

      const replyRes = await request(testApp.app.getHttpServer())
        .post(`/tickets/${ticketId}/messages`)
        .set('authorization', `Bearer ${token}`)
        .send({ content: 'Here is more info' })
        .expect(200)

      expect(replyRes.body.ticket.status).toBe('In Progress')
      expect(replyRes.body.message).toMatchObject({
        content: 'Here is more info',
        is_internal: false,
        role: 'Customer',
      })

      const dbTicket = await db.prisma.ticket.findUnique({ where: { id: ticketId } })
      expect(dbTicket?.status).toBe('InProgress')
    } finally {
      await testApp.close()
      await db.cleanup()
    }
  })
})
