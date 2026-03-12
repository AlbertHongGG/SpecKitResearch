import { describe, expect, it } from 'vitest';
import { cookieHeaderFromSetCookie, createTestApp } from '../test-utils/test-app';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = BigInt(ALPHABET.length);
const WIDTH = 10;

function encodeBase62FixedWidth(value: bigint): string {
  let v = value;
  const digits: string[] = Array(WIDTH).fill('0');
  for (let i = WIDTH - 1; i >= 0; i -= 1) {
    const d = Number(v % BASE);
    digits[i] = ALPHABET[d] as string;
    v /= BASE;
  }
  return digits.join('');
}

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

describe('tasks move route', () => {
  it('retries on (listId, position) unique conflict and succeeds', async () => {
    const { app, config, cleanup } = await createTestApp();
    try {
      const { cookie: ownerCookie, userId } = await register(app, config.WEB_ORIGIN, 'owner-us4@example.com');

      const projectRes = await app.inject({
        method: 'POST',
        url: '/projects',
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { name: 'P-us4', description: null },
      });
      expect(projectRes.statusCode).toBe(201);
      const project = projectRes.json();

      const boardRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/boards`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { name: 'B' },
      });
      expect(boardRes.statusCode).toBe(201);
      const board = boardRes.json();

      const listRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/lists`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { boardId: board.id, title: 'Todo' },
      });
      expect(listRes.statusCode).toBe(201);
      const list = listRes.json();

      const [pos10, pos20, pos30, pos40] = [10n, 20n, 30n, 40n].map(encodeBase62FixedWidth) as [
        string,
        string,
        string,
        string,
      ];

      const tA = await app.prisma.task.create({
        data: {
          projectId: project.id,
          boardId: board.id,
          listId: list.id,
          title: 'A',
          description: null,
          dueDate: null,
          priority: null,
          position: pos10,
          status: 'open',
          version: 1,
          createdByUserId: userId,
        },
      });

      const tB = await app.prisma.task.create({
        data: {
          projectId: project.id,
          boardId: board.id,
          listId: list.id,
          title: 'B',
          description: null,
          dueDate: null,
          priority: null,
          position: pos20,
          status: 'open',
          version: 1,
          createdByUserId: userId,
        },
      });

      const tC = await app.prisma.task.create({
        data: {
          projectId: project.id,
          boardId: board.id,
          listId: list.id,
          title: 'C',
          description: null,
          dueDate: null,
          priority: null,
          position: pos30,
          status: 'open',
          version: 1,
          createdByUserId: userId,
        },
      });

      const tD = await app.prisma.task.create({
        data: {
          projectId: project.id,
          boardId: board.id,
          listId: list.id,
          title: 'D',
          description: null,
          dueDate: null,
          priority: null,
          position: pos40,
          status: 'open',
          version: 1,
          createdByUserId: userId,
        },
      });

      // Insert D between A and C; midpoint (20) collides with existing B.
      const moveRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/tasks/${tD.id}/move`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: {
          toListId: list.id,
          afterTaskId: tA.id,
          beforeTaskId: tC.id,
          expectedVersion: 1,
          wipOverride: { enabled: false },
        },
      });

      expect(moveRes.statusCode).toBe(200);
      const moved = moveRes.json();
      expect(moved.id).toBe(tD.id);
      expect(moved.listId).toBe(list.id);
      expect(moved.position).not.toBe(tB.position);
      expect(moved.position > tA.position).toBe(true);
      expect(moved.position < tC.position).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it('returns 409 on version conflict (OCC)', async () => {
    const { app, config, cleanup } = await createTestApp();
    try {
      const { cookie: ownerCookie, userId } = await register(app, config.WEB_ORIGIN, 'owner-us4b@example.com');

      const projectRes = await app.inject({
        method: 'POST',
        url: '/projects',
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { name: 'P-us4b', description: null },
      });
      expect(projectRes.statusCode).toBe(201);
      const project = projectRes.json();

      const boardRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/boards`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { name: 'B' },
      });
      expect(boardRes.statusCode).toBe(201);
      const board = boardRes.json();

      const listRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/lists`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { boardId: board.id, title: 'Todo' },
      });
      expect(listRes.statusCode).toBe(201);
      const list = listRes.json();

      const task = await app.prisma.task.create({
        data: {
          projectId: project.id,
          boardId: board.id,
          listId: list.id,
          title: 'T',
          description: null,
          dueDate: null,
          priority: null,
          position: encodeBase62FixedWidth(10n),
          status: 'open',
          version: 2,
          createdByUserId: userId,
        },
      });

      const moveRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/tasks/${task.id}/move`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: {
          toListId: list.id,
          afterTaskId: null,
          beforeTaskId: null,
          expectedVersion: 1,
          wipOverride: { enabled: false },
        },
      });

      expect(moveRes.statusCode).toBe(409);
      expect(moveRes.json().error.code).toBe('VERSION_CONFLICT');
    } finally {
      await cleanup();
    }
  });
});
