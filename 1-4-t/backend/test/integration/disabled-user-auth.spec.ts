import * as request from 'supertest'
import { createTestApp, createTestDb } from '../test-utils'
import { hashPassword } from '../../src/modules/auth/password.util'

describe('US3 disabled user auth', () => {
  it('disabled user token becomes invalid on next verification', async () => {
    const db = await createTestDb()
    const testApp = await createTestApp({ databaseUrl: db.url })

    try {
      const adminEmail = 'admin-disable@example.com'
      const adminPassword = 'password123'
      const agentEmail = 'agent-disable@example.com'
      const agentPassword = 'password123'

      const [admin, agent] = await Promise.all([
        db.prisma.user.create({
          data: { email: adminEmail, passwordHash: await hashPassword(adminPassword), role: 'Admin', isActive: true },
          select: { id: true },
        }),
        db.prisma.user.create({
          data: { email: agentEmail, passwordHash: await hashPassword(agentPassword), role: 'Agent', isActive: true },
          select: { id: true },
        }),
      ])

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
        .patch(`/admin/users/${agent.id}`)
        .set('authorization', `Bearer ${adminToken}`)
        .send({ is_active: false })
        .expect(200)

      await request(testApp.app.getHttpServer())
        .get('/auth/me')
        .set('authorization', `Bearer ${agentToken}`)
        .expect(401)

      // Verify DB state reflects disable.
      const dbAgent = await db.prisma.user.findUnique({ where: { id: agent.id }, select: { isActive: true } })
      expect(dbAgent?.isActive).toBe(false)

      // Ensure IDs differ (sanity).
      expect(admin.id).not.toBe(agent.id)
    } finally {
      await testApp.close()
      await db.cleanup()
    }
  })
})
