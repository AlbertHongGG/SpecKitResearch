import * as request from 'supertest'
import { createTestApp, createTestDb } from '../test-utils'
import { hashPassword } from '../../src/modules/auth/password.util'

describe('US2 internal note visibility', () => {
  it('Customer detail never includes internal notes', async () => {
    const db = await createTestDb()
    const testApp = await createTestApp({ databaseUrl: db.url })

    try {
      const password = 'password123'

      // customer registers via API
      const registerRes = await request(testApp.app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'cust_internal@example.com', password, password_confirm: password })
        .expect(200)

      const customerToken = registerRes.body.token as string
      const customerId = registerRes.body.user.id as string

      // create ticket
      const createRes = await request(testApp.app.getHttpServer())
        .post('/tickets')
        .set('authorization', `Bearer ${customerToken}`)
        .send({ title: 'Internal visibility', category: 'Other', description: 'hi' })
        .expect(200)

      const ticketId = createRes.body.ticket.id as string

      // agent
      await db.prisma.user.create({
        data: {
          email: 'agent_internal@example.com',
          passwordHash: await hashPassword(password),
          role: 'Agent',
          isActive: true,
        },
      })

      const agentLogin = await request(testApp.app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'agent_internal@example.com', password })
        .expect(200)

      const agentToken = agentLogin.body.token as string

      // take then add internal note
      await request(testApp.app.getHttpServer())
        .post(`/tickets/${ticketId}/take`)
        .set('authorization', `Bearer ${agentToken}`)
        .expect(200)

      await request(testApp.app.getHttpServer())
        .post(`/tickets/${ticketId}/internal-notes`)
        .set('authorization', `Bearer ${agentToken}`)
        .send({ content: 'internal-only' })
        .expect(200)

      const detailRes = await request(testApp.app.getHttpServer())
        .get(`/tickets/${ticketId}`)
        .set('authorization', `Bearer ${customerToken}`)
        .expect(200)

      const messages = detailRes.body.ticket.messages as Array<any>
      expect(messages.some((m) => m.is_internal === true)).toBe(false)

      // sanity: customer can still see their ticket
      expect(detailRes.body.ticket.customer.id).toBe(customerId)
    } finally {
      await testApp.close()
      await db.cleanup()
    }
  })
})
