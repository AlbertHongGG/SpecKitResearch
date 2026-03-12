import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';

import { createIsolatedDatabaseUrl, migrateDatabase } from '../helpers/test-db';
import { createTestApp } from '../integration/app.harness';

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
  }),
});

const RegisterResponseSchema = z.object({ user_id: z.string().min(1) });
const LoginResponseSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['developer', 'admin']),
    status: z.enum(['active', 'disabled']),
  }),
});

const SessionResponseSchema = z.object({
  authenticated: z.boolean(),
  user: z
    .object({
      id: z.string().min(1),
      email: z.string().email(),
      role: z.enum(['developer', 'admin']),
      status: z.enum(['active', 'disabled']),
    })
    .optional(),
});

function getCookieHeader(setCookieHeader: string | string[] | undefined) {
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  if (!values.length) return '';
  return values.map((c) => c.split(';')[0]).join('; ');
}

describe('contract: auth', () => {
  const { databaseUrl } = createIsolatedDatabaseUrl('contract-auth');
  let app: any;

  beforeAll(async () => {
    migrateDatabase(databaseUrl);
    app = await createTestApp({ databaseUrl });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /register returns {user_id}', async () => {
    const res = await request(app.app.getHttpServer())
      .post('/register')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(201);

    expect(RegisterResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('POST /register duplicate email returns conflict error response', async () => {
    const res = await request(app.app.getHttpServer())
      .post('/register')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(409);

    const parsed = ErrorResponseSchema.parse(res.body);
    expect(parsed.error.code).toBe('CONFLICT');
  });

  it('GET /session without cookie returns authenticated=false', async () => {
    const res = await request(app.app.getHttpServer()).get('/session').expect(200);
    const parsed = SessionResponseSchema.parse(res.body);
    expect(parsed.authenticated).toBe(false);
    expect(parsed.user).toBeUndefined();
  });

  it('POST /login invalid credentials returns 401 + error response', async () => {
    const res = await request(app.app.getHttpServer())
      .post('/login')
      .send({ email: 'dev@example.com', password: 'wrong-password' })
      .expect(401);

    const parsed = ErrorResponseSchema.parse(res.body);
    expect(parsed.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /login sets cookie and GET /session returns authenticated user', async () => {
    const login = await request(app.app.getHttpServer())
      .post('/login')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(200);

    const loginBody = LoginResponseSchema.parse(login.body);
    expect(loginBody.user.role).toBe('developer');

    const cookieHeader = getCookieHeader(login.headers['set-cookie']);
    expect(cookieHeader).toContain('sid=');

    const sess = await request(app.app.getHttpServer())
      .get('/session')
      .set('cookie', cookieHeader)
      .expect(200);

    const sessBody = SessionResponseSchema.parse(sess.body);
    expect(sessBody.authenticated).toBe(true);
    expect(sessBody.user?.id).toBe(loginBody.user.id);
  });

  it('POST /logout clears cookie and session becomes unauthenticated', async () => {
    const login = await request(app.app.getHttpServer())
      .post('/login')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(200);

    const cookieHeader = getCookieHeader(login.headers['set-cookie']);

    await request(app.app.getHttpServer()).post('/logout').set('cookie', cookieHeader).expect(204);

    const sess = await request(app.app.getHttpServer())
      .get('/session')
      .set('cookie', cookieHeader)
      .expect(200);

    expect(SessionResponseSchema.parse(sess.body).authenticated).toBe(false);
  });
});
