import * as request from 'supertest'
import { createTestApp, createTestDb } from '../test-utils'

describe('US1 auth happy path', () => {
  it('register/login/me works', async () => {
    const db = await createTestDb()
    const testApp = await createTestApp({ databaseUrl: db.url })

    try {
      const email = 'customer1@example.com'
      const password = 'password123'

      const registerRes = await request(testApp.app.getHttpServer())
        .post('/auth/register')
        .send({ email, password, password_confirm: password })
        .expect(200)

      expect(registerRes.body.token).toBeTruthy()
      expect(registerRes.body.user).toMatchObject({ email, role: 'Customer' })

      const token = registerRes.body.token as string
      const meRes = await request(testApp.app.getHttpServer())
        .get('/auth/me')
        .set('authorization', `Bearer ${token}`)
        .expect(200)

      expect(meRes.body).toMatchObject({ email, role: 'Customer' })

      const loginRes = await request(testApp.app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200)

      expect(loginRes.body.token).toBeTruthy()
      expect(loginRes.body.user).toMatchObject({ email, role: 'Customer' })
    } finally {
      await testApp.close()
      await db.cleanup()
    }
  })
})
