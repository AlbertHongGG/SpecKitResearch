import request from 'supertest';
import { createTestApp } from '../test-app';

describe('Error envelope', () => {
  it('returns requestId + error envelope for 401', async () => {
    const app = await createTestApp();
    const res = await request(app.getHttpServer()).get('/api/debug/any');

    expect(res.status).toBe(401);
    expect(res.body.requestId).toBeTruthy();
    expect(res.body.error?.code).toBeTruthy();
    await app.close();
  });
});
