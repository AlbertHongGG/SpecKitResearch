import { describe, expect, it } from 'vitest';
import { cookieHeaderFromSetCookie, createTestApp } from '../test-utils/test-app';

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

describe('comments + activity routes', () => {
  it('can create comment (append-only) and see activity entries', async () => {
    const { app, config, cleanup } = await createTestApp();
    try {
      const { cookie: ownerCookie, userId } = await register(app, config.WEB_ORIGIN, 'owner-cmt@example.com');

      const projectRes = await app.inject({
        method: 'POST',
        url: '/projects',
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { name: 'P', description: null },
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
          position: '000000000A',
          status: 'open',
          version: 1,
          createdByUserId: userId,
        },
      });

      const commentRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/tasks/${task.id}/comments`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { content: 'hello' },
      });

      expect(commentRes.statusCode).toBe(201);
      const comment = commentRes.json();
      expect(comment.taskId).toBe(task.id);
      expect(comment.content).toBe('hello');

      const activityRes = await app.inject({
        method: 'GET',
        url: `/projects/${project.id}/activity?limit=50`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
      });

      expect(activityRes.statusCode).toBe(200);
      const body = activityRes.json();
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThan(0);
    } finally {
      await cleanup();
    }
  });
});
