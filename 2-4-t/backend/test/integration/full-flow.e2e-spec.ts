import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/shared/http/http-exception.filter';
import { RequestIdMiddleware } from '../../src/shared/http/request-id.middleware';

const TEST_DB_FILE = 'file:./test/integration/test.db';

describe('integration: full flow', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_FILE;
    process.env.COOKIE_SECURE = 'false';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

    execSync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: TEST_DB_FILE },
      stdio: 'inherit'
    });
    execSync('npm run -s db:seed', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: TEST_DB_FILE },
      stdio: 'inherit'
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.use(new RequestIdMiddleware().use);
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  it(
    'login → create → edit → publish → submit → results/export',
    async () => {
      const agent = request.agent(app.getHttpServer());

      const loginRes = await agent
        .post('/login')
        .set('Origin', 'http://localhost:3000')
        .send({ username: 'demo', password: 'demo' })
        .expect(201);

      const rawSetCookie = loginRes.headers['set-cookie'];
      const setCookie = Array.isArray(rawSetCookie)
        ? rawSetCookie
        : typeof rawSetCookie === 'string'
          ? [rawSetCookie]
          : [];
      expect(setCookie.length > 0).toBe(true);
      const cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');

      const csrfToken = loginRes.body?.csrf_token as string | undefined;
      expect(typeof csrfToken).toBe('string');

      const slug = `it-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const createRes = await agent
        .post('/surveys')
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', csrfToken!)
        .send({ title: 'Integration Survey', slug, is_anonymous: true, description: null })
        .expect(201);

      const surveyId = createRes.body?.survey?.id as string;
      expect(typeof surveyId).toBe('string');

      const q1 = randomUUID();
      const q2 = randomUUID();
      const rg1 = randomUUID();
      const r1 = randomUUID();

      await agent
        .patch(`/surveys/${surveyId}`)
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', csrfToken!)
        .send({
          questions: [
            { id: q1, title: 'Q1', type: 'TEXT', required: true },
            { id: q2, title: 'Q2', type: 'TEXT', required: false, description: 'Visible when Q1=yes' }
          ],
          rule_groups: [
            {
              id: rg1,
              target_question_id: q2,
              action: 'show',
              mode: 'AND',
              rules: [{ id: r1, source_question_id: q1, operator: 'equals', value: 'yes' }]
            }
          ]
        })
        .expect(200);

      const publishRes = await agent
        .post(`/surveys/${surveyId}/publish`)
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', csrfToken!)
        .expect(201);

      const publishHash = publishRes.body?.survey?.publish_hash as string;
      expect(typeof publishHash).toBe('string');

      await agent.get(`/s/${encodeURIComponent(slug)}`).expect(200);

      const submitRes = await agent
        .post(`/s/${encodeURIComponent(slug)}/responses`)
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', csrfToken!)
        .send({ answers: [{ question_id: q1, value: 'yes' }, { question_id: q2, value: 'hello' }] })
        .expect(201);

      expect(typeof submitRes.body?.response?.response_id).toBe('string');
      expect(submitRes.body?.response?.publish_hash).toBe(publishHash);
      expect(typeof submitRes.body?.response?.response_hash).toBe('string');

      const resultsRes = await agent
        .get(`/surveys/${surveyId}/results`)
        .set('Cookie', cookieHeader)
        .expect(200);
      expect(resultsRes.body?.response_count).toBe(1);
      expect(resultsRes.body?.publish_hash).toBe(publishHash);

      const exportJson = await agent
        .get(`/surveys/${surveyId}/export?format=json`)
        .set('Cookie', cookieHeader)
        .expect(200);
      expect(exportJson.body?.export?.format).toBe('json');
      expect(Array.isArray(exportJson.body?.export?.rows)).toBe(true);
      expect(exportJson.body.export.rows.length).toBe(1);
    },
    120_000
  );
});
