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

async function login(page: any, returnTo: string) {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  await page.locator('input[autocomplete="email"]').fill('admin@example.com');
  await page.locator('input[type="password"][autocomplete="current-password"]').fill('password1234');
  await page.getByRole('button', { name: '登入' }).click();
}

test('sprint lifecycle (planned → active → closed)', async ({ page, request }) => {
  const projectId = await getProjectIdByKey(request, 'SCRUM');

  const sprintsPath = `/projects/${projectId}/sprints`;
  await login(page, sprintsPath);
  await page.waitForURL(`**${sprintsPath}`);

  const sprintName = `Sprint ${Date.now()}`;

  await page.getByLabel('Sprint name').fill(sprintName);
  await page.getByRole('button', { name: 'Create sprint' }).click();

  const sprintCard = page.locator('section', { hasText: sprintName });
  await expect(sprintCard).toBeVisible();
  await expect(sprintCard.getByText('Status: planned')).toBeVisible();

  await sprintCard.getByRole('button', { name: 'Start' }).click();
  await expect(sprintCard.getByText('Status: active')).toBeVisible();

  await sprintCard.getByRole('button', { name: 'Close' }).click();
  await expect(sprintCard.getByText('Status: closed')).toBeVisible();
});
