import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { z } from 'zod';
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/errors/http-exception.filter';
import { requestIdMiddleware } from '../../src/common/request/request-id.middleware';

type SupertestServer = Parameters<typeof request>[0];

const ApiUserSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    role: z.string(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

const AuthUserResponseSchema = z.object({ user: ApiUserSchema }).passthrough();

const LoginResponseSchema = z
  .object({
    token: z.string(),
    refresh_token: z.string(),
    user: ApiUserSchema,
  })
  .passthrough();

describe('auth smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const backendRoot = path.resolve(__dirname, '../..');
    const testDbPath = path.join(backendRoot, 'prisma', 'test.db');

    if (existsSync(testDbPath)) rmSync(testDbPath);

    execSync('npx prisma migrate deploy', {
      cwd: backendRoot,
      env: { ...process.env },
      stdio: 'inherit',
    });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(requestIdMiddleware);
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('register/login/refresh/logout', async () => {
    const email = `smoke+${Date.now()}@example.com`;
    const password = 'password123';

    const server = app.getHttpServer() as unknown as SupertestServer;

    const registerRes = await request(server)
      .post('/auth/register')
      .send({
        email,
        password,
        password_confirm: password,
      })
      .expect(201);

    expect(registerRes.headers['x-request-id']).toBeTruthy();
    const registerBody = AuthUserResponseSchema.parse(registerRes.body);
    expect(registerBody.user.email).toBe(email);

    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const loginBody = LoginResponseSchema.parse(loginRes.body);
    expect(loginBody.user.email).toBe(email);

    const refreshRes = await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: loginBody.refresh_token })
      .expect(200);

    const refreshBody = LoginResponseSchema.parse(refreshRes.body);
    expect(refreshBody.refresh_token).not.toBe(loginBody.refresh_token);

    await request(server)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${refreshBody.token}`)
      .expect(200);

    await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: refreshBody.refresh_token })
      .expect(401);
  });
});
