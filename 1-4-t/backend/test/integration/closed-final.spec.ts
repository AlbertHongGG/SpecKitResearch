import * as request from 'supertest'
import { createTestApp, createTestDb } from '../test-utils'

describe('US1 closed final', () => {
  it('Resolved -> Closed then any writes are rejected', async () => {
    const db = await createTestDb()
    const testApp = await createTestApp({ databaseUrl: db.url })

    try {
      const email = 'customer4@example.com'
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
          title: 'Close test',
          category: 'Billing',
          description: 'Initial',
        })
        .expect(200)

      const ticketId = createRes.body.ticket.id as string

      await db.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'Resolved' },
      })

      const closeRes = await request(testApp.app.getHttpServer())
        .post(`/tickets/${ticketId}/status`)
        .set('authorization', `Bearer ${token}`)
        .send({ from_status: 'Resolved', to_status: 'Closed' })
        .expect(200)

      expect(closeRes.body.ticket.status).toBe('Closed')
      expect(closeRes.body.ticket.closed_at).toBeTruthy()

      const postRes = await request(testApp.app.getHttpServer())
        .post(`/tickets/${ticketId}/messages`)
        .set('authorization', `Bearer ${token}`)
        .send({ content: 'should fail' })
        .expect(400)

      expect(postRes.body.error?.code).toBe('CLOSED_FINAL')

      const statusRes = await request(testApp.app.getHttpServer())
        .post(`/tickets/${ticketId}/status`)
        .set('authorization', `Bearer ${token}`)
        .send({ from_status: 'Closed', to_status: 'In Progress' })
        .expect(400)

      expect(statusRes.body.error?.code).toBe('CLOSED_FINAL')
    } finally {
      await testApp.close()
      await db.cleanup()
    }
  })
})
