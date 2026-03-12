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

async function login(page: any, returnTo: string) {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  await page.locator('input[autocomplete="email"]').fill('admin@example.com');
  await page.locator('input[type="password"][autocomplete="current-password"]').fill('password1234');
  await page.getByRole('button', { name: '登入' }).click();
}

test('create issue then view detail', async ({ page, request }) => {
  const projectId = await getDemoProjectId(request);

  const boardPath = `/projects/${projectId}/board`;
  await login(page, boardPath);
  await page.waitForURL(`**${boardPath}`);

  const title = `E2E issue ${Date.now()}`;

  await page.getByRole('button', { name: 'Create issue' }).click();
  await page.locator('label:has-text("Title") input').fill(title);
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  const card = page.getByRole('link', { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await card.click();

  await page.waitForURL(`**/projects/${projectId}/issues/**`);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('Status:')).toBeVisible();
});
