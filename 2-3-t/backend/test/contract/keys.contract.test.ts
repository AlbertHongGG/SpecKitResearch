import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';

import { createIsolatedDatabaseUrl, migrateDatabase } from '../helpers/test-db';
import { createTestApp } from '../integration/app.harness';

const KeysIndexSchema = z.object({
  keys: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.string(),
      scopes: z.array(z.string()),
      created_at: z.string(),
      secret_last4: z.string().optional(),
    }),
  ),
  limits: z.object({
    default_per_minute: z.number(),
    default_per_hour: z.number(),
    max_per_minute: z.number(),
    max_per_hour: z.number(),
  }),
  scopes: z.array(z.object({ id: z.string(), name: z.string(), description: z.string().nullable().optional() })),
});

const CreateKeyResponseSchema = z.object({
  api_key: z.object({ id: z.string(), name: z.string() }),
  plain_key: z.string().min(10),
});

const UpdateKeyResponseSchema = z.object({
  api_key: z.object({ id: z.string(), name: z.string() }),
});

const UsagePageSchema = z.object({
  items: z.array(
    z.object({
      occurred_at: z.string(),
      http_method: z.string(),
      path: z.string(),
      status_code: z.number(),
      response_time_ms: z.number(),
    }),
  ),
  next_cursor: z.string().nullable(),
});

function getCookieHeader(setCookieHeader: string | string[] | undefined) {
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  if (!values.length) return '';
  return values.map((c) => c.split(';')[0]).join('; ');
}

describe('contract: keys', () => {
  const { databaseUrl } = createIsolatedDatabaseUrl('contract-keys');
  let app: any;
  let cookieHeader = '';

  beforeAll(async () => {
    migrateDatabase(databaseUrl);
    app = await createTestApp({ databaseUrl });

    await request(app.app.getHttpServer())
      .post('/register')
      .send({ email: 'dev2@example.com', password: 'correct-horse-battery-staple' })
      .expect(201);

    const login = await request(app.app.getHttpServer())
      .post('/login')
      .send({ email: 'dev2@example.com', password: 'correct-horse-battery-staple' })
      .expect(200);

    cookieHeader = getCookieHeader(login.headers['set-cookie']);
    expect(cookieHeader).toContain('sid=');
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /keys returns keys + limits + scopes', async () => {
    const res = await request(app.app.getHttpServer()).get('/keys').set('cookie', cookieHeader).expect(200);
    KeysIndexSchema.parse(res.body);
  });

  it('POST /keys returns api_key and plain_key (show-once)', async () => {
    const res = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', cookieHeader)
      .send({ name: 'My Key', scopes: [], rate_limit_per_minute: 3, rate_limit_per_hour: 10 })
      .expect(201);

    const body = CreateKeyResponseSchema.parse(res.body);
    expect(body.plain_key.startsWith('sk_')).toBe(true);

    // show-once: plain_key must not appear in later reads
    const idx = await request(app.app.getHttpServer()).get('/keys').set('cookie', cookieHeader).expect(200);
    const idxBody = KeysIndexSchema.parse(idx.body);
    expect(JSON.stringify(idxBody)).not.toContain(body.plain_key);
  });

  it('PATCH /keys/:id returns api_key', async () => {
    const create = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', cookieHeader)
      .send({ name: 'Key To Update', scopes: [] })
      .expect(201);

    const created = CreateKeyResponseSchema.parse(create.body);

    const res = await request(app.app.getHttpServer())
      .patch(`/keys/${created.api_key.id}`)
      .set('cookie', cookieHeader)
      .send({ name: 'Updated Name' })
      .expect(200);

    const body = UpdateKeyResponseSchema.parse(res.body);
    expect(body.api_key.name).toBe('Updated Name');
  });

  it('POST /keys/:id/revoke returns api_key', async () => {
    const create = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', cookieHeader)
      .send({ name: 'Key To Revoke', scopes: [] })
      .expect(201);

    const created = CreateKeyResponseSchema.parse(create.body);

    const res = await request(app.app.getHttpServer())
      .post(`/keys/${created.api_key.id}/revoke`)
      .set('cookie', cookieHeader)
      .expect(200);

    const body = UpdateKeyResponseSchema.parse(res.body);
    expect(body.api_key.id).toBe(created.api_key.id);
  });

  it('GET /keys/:id/usage returns UsageLogPage shape', async () => {
    const create = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', cookieHeader)
      .send({ name: 'Key Usage', scopes: [] })
      .expect(201);

    const created = CreateKeyResponseSchema.parse(create.body);

    const res = await request(app.app.getHttpServer())
      .get(`/keys/${created.api_key.id}/usage?limit=10`)
      .set('cookie', cookieHeader)
      .expect(200);

    UsagePageSchema.parse(res.body);
  });
});
