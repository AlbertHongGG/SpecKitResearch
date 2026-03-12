import { expect, test } from '@playwright/test';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000';

async function getDemoProjectId(request: any): Promise<string> {
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
    const demo = projectsBody.projects.find((p) => p.key === 'PROJ') ?? projectsBody.projects[0];
    if (demo) return demo.id;
  }

  throw new Error('Demo project not found');
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

test('transition writes audit event', async ({ page, request }) => {
  const projectId = await getDemoProjectId(request);
  const title = `E2E transition ${Date.now()}`;
  const issueKey = await createIssue(request, projectId, title);

  const issuePath = `/projects/${projectId}/issues/${encodeURIComponent(issueKey)}`;
  await page.goto(`/login?returnTo=${encodeURIComponent(issuePath)}`);
  await page.locator('input[autocomplete="email"]').fill('admin@example.com');
  await page.locator('input[type="password"][autocomplete="current-password"]').fill('password1234');
  await page.getByRole('button', { name: '登入' }).click();
  await page.waitForURL(`**${issuePath}`);

  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  const transitionSelect = page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'Transition…' }) });
  await transitionSelect.selectOption('in_progress');
  await page.getByRole('button', { name: 'Go' }).click();

  await expect(page.getByText('ISSUE_TRANSITIONED')).toBeVisible({ timeout: 15000 });
});
