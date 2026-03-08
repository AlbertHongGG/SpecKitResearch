import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createIsolatedDatabaseUrl, migrateDatabase } from '../helpers/test-db';
import { createTestApp } from './app.harness';

function getCookieHeader(setCookieHeader: string[] | string | undefined) {
  const arr = typeof setCookieHeader === 'string' ? [setCookieHeader] : setCookieHeader;
  if (!arr?.length) return '';
  return arr.map((c) => c.split(';')[0]).join('; ');
}

describe('US1: auth → keys (integration)', () => {
  const { databaseUrl } = createIsolatedDatabaseUrl('integration-us1-auth-keys');
  let app: any;

  beforeAll(async () => {
    migrateDatabase(databaseUrl);
    app = await createTestApp({ databaseUrl });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('register → login → create key shows plain_key once', async () => {
    await request(app.app.getHttpServer())
      .post('/register')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(201);

    const login = await request(app.app.getHttpServer())
      .post('/login')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(200);

    const cookieHeader = getCookieHeader(login.headers['set-cookie']);
    expect(cookieHeader).toContain('sid=');

    const create = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', cookieHeader)
      .send({ name: 'My Key', scopes: [], rate_limit_per_minute: 3, rate_limit_per_hour: 10 })
      .expect(201);

    expect(create.body?.plain_key).toMatch(/^sk_/);

    // Show-once: plain_key must not be returned by any later reads.
    const idx = await request(app.app.getHttpServer()).get('/keys').set('cookie', cookieHeader).expect(200);
    expect(JSON.stringify(idx.body)).not.toContain(create.body.plain_key);

    // Patching key must also not echo back plain_key.
    const keyId = create.body.api_key.id as string;
    const updated = await request(app.app.getHttpServer())
      .patch(`/keys/${keyId}`)
      .set('cookie', cookieHeader)
      .send({ name: 'My Renamed Key' })
      .expect(200);

    expect(JSON.stringify(updated.body)).not.toContain(create.body.plain_key);
  });
});
