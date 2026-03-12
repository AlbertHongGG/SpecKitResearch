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
  return cookieHeaderFromSetCookie(res.headers['set-cookie'] as any);
}

describe('boards/lists routes', () => {
  it('can create/update/archive board and create/update/reorder/archive lists (with archived read-only)', async () => {
    const { app, config, cleanup } = await createTestApp();
    try {
      const ownerCookie = await register(app, config.WEB_ORIGIN, 'owner3@example.com');

      const projectRes = await app.inject({
        method: 'POST',
        url: '/projects',
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { name: 'P3', description: null },
      });
      expect(projectRes.statusCode).toBe(201);
      const project = projectRes.json();

      const createBoard = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/boards`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { name: 'B1' },
      });
      expect(createBoard.statusCode).toBe(201);
      const board = createBoard.json();
      expect(board.projectId).toBe(project.id);
      expect(board.status).toBe('active');

      const updateBoard = await app.inject({
        method: 'PATCH',
        url: `/projects/${project.id}/boards/${board.id}`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { version: board.version, name: 'B1-renamed' },
      });
      expect(updateBoard.statusCode).toBe(200);
      const board2 = updateBoard.json();
      expect(board2.name).toBe('B1-renamed');
      expect(board2.version).toBeGreaterThan(board.version);

      const list1Res = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/lists`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { boardId: board.id, title: 'Todo' },
      });
      expect(list1Res.statusCode).toBe(201);
      const list1 = list1Res.json();

      const list2Res = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/lists`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { boardId: board.id, title: 'Doing' },
      });
      expect(list2Res.statusCode).toBe(201);
      const list2 = list2Res.json();

      const reorderRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/boards/${board.id}/lists/reorder`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { orderedListIds: [list2.id, list1.id] },
      });
      expect(reorderRes.statusCode).toBe(200);
      expect(reorderRes.json().orderedListIds).toEqual([list2.id, list1.id]);

      const updateListRes = await app.inject({
        method: 'PATCH',
        url: `/projects/${project.id}/lists/${list1.id}`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { version: list1.version, title: 'To do', isWipLimited: true, wipLimit: 2 },
      });
      expect(updateListRes.statusCode).toBe(200);
      const list1b = updateListRes.json();
      expect(list1b.title).toBe('To do');
      expect(list1b.isWipLimited).toBe(true);
      expect(list1b.wipLimit).toBe(2);

      const archiveListRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/lists/${list2.id}/archive`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { version: list2.version, reason: 'done' },
      });
      expect(archiveListRes.statusCode).toBe(200);
      expect(archiveListRes.json().status).toBe('archived');

      const patchArchivedList = await app.inject({
        method: 'PATCH',
        url: `/projects/${project.id}/lists/${list2.id}`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { version: list2.version, title: 'Nope' },
      });
      expect(patchArchivedList.statusCode).toBe(409);
      expect(patchArchivedList.json().error.code).toBe('ARCHIVED_READ_ONLY');

      const archiveBoardRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/boards/${board.id}/archive`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { version: board2.version, reason: 'done' },
      });
      expect(archiveBoardRes.statusCode).toBe(200);
      expect(archiveBoardRes.json().status).toBe('archived');

      const createListOnArchivedBoard = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/lists`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { boardId: board.id, title: 'After' },
      });
      expect(createListOnArchivedBoard.statusCode).toBe(409);
      expect(createListOnArchivedBoard.json().error.code).toBe('ARCHIVED_READ_ONLY');

      const archiveProjectRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/archive`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { version: project.version, reason: 'done' },
      });
      expect(archiveProjectRes.statusCode).toBe(200);

      const createBoardOnArchivedProject = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/boards`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { name: 'B2' },
      });
      expect(createBoardOnArchivedProject.statusCode).toBe(409);
      expect(createBoardOnArchivedProject.json().error.code).toBe('ARCHIVED_READ_ONLY');
    } finally {
      await cleanup();
    }
  });

  it('only owner/admin can change WIP settings', async () => {
    const { app, config, cleanup } = await createTestApp();
    try {
      const ownerCookie = await register(app, config.WEB_ORIGIN, 'owner4@example.com');

      const projectRes = await app.inject({
        method: 'POST',
        url: '/projects',
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { name: 'P4', description: null },
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
        payload: { boardId: board.id, title: 'L' },
      });
      expect(listRes.statusCode).toBe(201);
      const list = listRes.json();

      const invRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/invitations`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { email: 'member4@example.com', role: 'member' },
      });
      expect(invRes.statusCode).toBe(201);
      const invitation = invRes.json();

      const memberCookie = await register(app, config.WEB_ORIGIN, 'member4@example.com');
      const acceptRes = await app.inject({
        method: 'POST',
        url: `/invitations/${invitation.id}/accept`,
        headers: { origin: config.WEB_ORIGIN, cookie: memberCookie },
      });
      expect(acceptRes.statusCode).toBe(200);

      const patchWip = await app.inject({
        method: 'PATCH',
        url: `/projects/${project.id}/lists/${list.id}`,
        headers: { origin: config.WEB_ORIGIN, cookie: memberCookie },
        payload: { version: list.version, isWipLimited: true, wipLimit: 1 },
      });
      expect(patchWip.statusCode).toBe(403);
    } finally {
      await cleanup();
    }
  });
});
