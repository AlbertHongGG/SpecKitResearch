import { describe, expect, it } from 'vitest';
import WebSocket, { type RawData } from 'ws';
import type { ClientRequest, IncomingMessage } from 'node:http';
import { createTestApp, cookieHeaderFromSetCookie } from '../test-utils/test-app';

async function register(app: any, origin: string, email: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    headers: { origin },
    payload: { email, password: 'password123', displayName: email.split('@')[0] },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  return { cookie: cookieHeaderFromSetCookie(res.headers['set-cookie'] as any), userId: body.user.id };
}

async function createProject(app: any, origin: string, cookie: string, name: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/projects',
    headers: { origin, cookie },
    payload: { name },
  });
  expect(res.statusCode).toBe(201);
  return res.json();
}

describe('realtime websocket', () => {
  it(
    'connects, sends hello, receives snapshot',
    async () => {
    const { app, config, cleanup } = await createTestApp();

    const address = await app.listen({ port: 0, host: '127.0.0.1' });
    const port = Number(new URL(address).port);

    try {
      const { cookie } = await register(app, config.WEB_ORIGIN, 'ws1@example.com');
      const project = await createProject(app, config.WEB_ORIGIN, cookie, 'WS Project');

      const ws = new WebSocket(`ws://127.0.0.1:${port}/realtime?projectId=${project.id}`, {
        headers: { origin: config.WEB_ORIGIN, cookie },
      });

      const snapshot = await new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), 10_000);

        ws.on('open', () => {
          ws.send(
            JSON.stringify({
              type: 'hello',
              projectId: project.id,
              lastSeenSeq: null,
              clientId: 'c_test',
              capabilities: { supportsSnapshot: true },
            })
          );
        });

        ws.on('message', (data: RawData) => {
          clearTimeout(timer);
          try {
            resolve(JSON.parse(data.toString('utf8')));
          } catch (e) {
            reject(e);
          }
        });

        ws.on('unexpected-response', (_req: ClientRequest, res: IncomingMessage) => {
          clearTimeout(timer);
          reject(new Error(`unexpected-response ${res.statusCode}`));
        });

        ws.on('close', (code: number, reason: Buffer) => {
          clearTimeout(timer);
          reject(new Error(`closed ${code} ${reason.toString()}`));
        });

        ws.on('error', (err: Error) => {
          clearTimeout(timer);
          reject(err);
        });
      });

      expect(snapshot.type).toBe('snapshot');
      expect(snapshot.projectId).toBe(project.id);
      expect(snapshot.payload?.project?.id).toBe(project.id);

      ws.close();
    } finally {
      await cleanup();
    }
    },
    15_000
  );
});
