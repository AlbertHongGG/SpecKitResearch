import { expect, test } from '@playwright/test';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000';

async function getProjectIdByKey(request: any, key: string): Promise<string> {
  const loginRes = await request.post(`${API_ORIGIN}/auth/login`, {
    data: { email: 'admin@example.com', password: 'password1234' },
  });
  expect(loginRes.ok()).toBeTruthy();

  const orgsRes = await request.get(`${API_ORIGIN}/orgs`);
  expect(orgsRes.ok()).toBeTruthy();
  const orgsBody = (await orgsRes.json()) as { organizations: Array<{ id: string }> };

  for (const org of orgsBody.organizations) {
    const projectsRes = await request.get(`${API_ORIGIN}/orgs/${org.id}/projects`);
    if (!projectsRes.ok()) continue;
    const projectsBody = (await projectsRes.json()) as { projects: Array<{ id: string; key: string }> };
    const p = projectsBody.projects.find((p) => p.key === key);
    if (p) return p.id;
  }

  throw new Error(`Project not found: ${key}`);
}

async function createIssue(request: any, projectId: string, title: string): Promise<string> {
  const csrfRes = await request.get(`${API_ORIGIN}/auth/csrf`);
  expect(csrfRes.ok()).toBeTruthy();
  const csrfBody = (await csrfRes.json()) as { csrfToken: string };

  const res = await request.post(`${API_ORIGIN}/projects/${projectId}/issues`, {
    data: { type: 'task', title, priority: 'medium' },
    headers: { 'x-csrf-token': csrfBody.csrfToken },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { issueKey: string };
  return body.issueKey;
}

async function login(page: any, returnTo: string) {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  await page.locator('input[autocomplete="email"]').fill('admin@example.com');
  await page.locator('input[type="password"][autocomplete="current-password"]').fill('password1234');
  await page.getByRole('button', { name: '登入' }).click();
}

test('kanban drag/drop triggers allowed transition', async ({ page, request }) => {
  const projectId = await getProjectIdByKey(request, 'PROJ');

  const title = `E2E DnD ${Date.now()}`;
  await createIssue(request, projectId, title);

  const boardPath = `/projects/${projectId}/board`;
  await login(page, boardPath);
  await page.waitForURL(`**${boardPath}`);

  const todoCol = page.locator('[data-testid="kanban-column-todo"]');
  const inProgressCol = page.locator('[data-testid="kanban-column-in_progress"]');

  const cardInTodo = todoCol.getByRole('link', { name: new RegExp(title) });
  await expect(cardInTodo).toBeVisible();

  await cardInTodo.dragTo(inProgressCol);

  const cardInProgress = inProgressCol.getByRole('link', { name: new RegExp(title) });
  await expect(cardInProgress).toBeVisible();
  await expect(todoCol.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);
});
