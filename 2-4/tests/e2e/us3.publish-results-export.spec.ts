import { test, expect } from '@playwright/test';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

type SpawnedServer = {
  label: string;
  child: ChildProcess;
  getLog: () => string;
  getExit: () => { code: number | null; signal: NodeJS.Signals | null } | null;
};

async function waitForUrlOk(url: string, timeoutMs = 60_000, proc?: SpawnedServer) {
  const start = Date.now();
  while (true) {
    const exited = proc?.getExit();
    if (exited) {
      throw new Error(
        `${proc?.label ?? 'server'} process exited early (code=${exited.code} signal=${exited.signal}) while waiting for ${url}. Logs:\n${proc?.getLog() ?? ''}`,
      );
    }

    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ignore
    }

    if (Date.now() - start > timeoutMs) {
      const extra = proc ? `\n${proc.label} logs:\n${proc.getLog()}` : '';
      throw new Error(`Timed out waiting for ${url}${extra}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to allocate free port')));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

function spawnServer(
  label: string,
  command: string,
  args: string[],
  options: { cwd: string; env: Record<string, string | undefined> },
): SpawnedServer {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: 'pipe',
    detached: true,
  });

  let exited: { code: number | null; signal: NodeJS.Signals | null } | null = null;
  let log = '';
  const append = (chunk: unknown) => {
    const s = typeof chunk === 'string' ? chunk : Buffer.isBuffer(chunk) ? chunk.toString('utf8') : '';
    if (!s) return;
    log = (log + s).slice(-12_000);
  };

  child.on('exit', (code, signal) => {
    exited = { code, signal };
  });
  child.stdout?.on('data', append);
  child.stderr?.on('data', append);

  return {
    label,
    child,
    getLog: () => log,
    getExit: () => exited,
  };
}

function killProcessTree(child: ChildProcess | null) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    // ignore
  }
}

test.describe('US3 publish → respond → results/export (e2e)', () => {
  const root = path.resolve(__dirname, '../..');
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'dynamic-survey-e2e-us3-'));
  const dbPath = path.join(tmp, 'e2e.db');

  let apiPort: number;
  let webPort: number;

  let api: ReturnType<typeof spawnServer> | null = null;
  let web: ReturnType<typeof spawnServer> | null = null;

  test.beforeAll(async () => {
    apiPort = await getFreePort();
    webPort = await getFreePort();

    const apiOrigin = `http://localhost:${apiPort}`;
    const webOrigin = `http://localhost:${webPort}`;

    const envApi: Record<string, string> = {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
      SESSION_SECRET: 'test-only',
      APP_BASE_URL: webOrigin,
      PORT: String(apiPort),
    };

    const envWeb: Record<string, string> = {
      ...process.env,
      API_ORIGIN: apiOrigin,
      NEXT_TELEMETRY_DISABLED: '1',
      PORT: String(webPort),
    };

    const schemaPath = path.join(root, 'prisma', 'schema.prisma');
    execSync(`npx prisma db push --schema "${schemaPath}" --skip-generate`, {
      cwd: root,
      env: envApi,
      stdio: 'inherit',
    });

    execSync('node prisma/seed.js', {
      cwd: root,
      env: envApi,
      stdio: 'inherit',
    });

    api = spawnServer('api', 'npm', ['-w', 'apps/api', 'run', 'start:test'], { cwd: root, env: envApi });
    await waitForUrlOk(`${apiOrigin}/auth/session`, 60_000, api);

    web = spawnServer('web', 'npx', ['--no-install', 'next', 'dev', '-p', String(webPort)], {
      cwd: path.join(root, 'apps/web'),
      env: envWeb,
    });
    await waitForUrlOk(`${webOrigin}/login`, 120_000, web);
  });

  test.afterEach(async (_args, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) return;
    if (api) console.log(`\n[api logs]\n${api.getLog()}\n`);
    if (web) console.log(`\n[web logs]\n${web.getLog()}\n`);
  });

  test.afterAll(async () => {
    killProcessTree(web?.child ?? null);
    killProcessTree(api?.child ?? null);
  });

  test('publish, submit one response, see results and export', async ({ page }, testInfo) => {
    testInfo.setTimeout(160_000);
    const origin = `http://localhost:${webPort}`;

    await page.goto(`${origin}/login?return_to=/surveys`);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/\/surveys/);

    const uniqueSlug = `e2e-us3-${Date.now()}`;
    const createSection = page.locator('section', { hasText: 'Create draft' });
    await createSection.getByLabel('Slug').fill(uniqueSlug);
    await createSection.getByLabel('Title').fill('E2E US3 Survey');
    await createSection.getByRole('button', { name: 'Create' }).click();

    await page.waitForURL(/\/surveys\/([0-9a-f-]{36})\/edit/);
    const surveyId = page.url().match(/\/surveys\/([0-9a-f-]{36})\/edit/)?.[1];
    expect(surveyId).toBeTruthy();

    // Add one required text question
    await page.getByRole('button', { name: 'Add question' }).click();
    const selectedQuestion = page.locator('div.border-zinc-900');
    await selectedQuestion.getByLabel('Title').fill('Your name');
    await selectedQuestion.getByLabel('Type').selectOption('Text');
    await selectedQuestion.getByLabel('Required').check();

    // Save draft
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    // Publish
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText(/Status:\s+Published/)).toBeVisible();

    // Submit one response as respondent
    await page.goto(`${origin}/s/${uniqueSlug}`);
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
    await page.getByPlaceholder('Type your answer').fill('Alice');
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.waitForURL(/\/complete\?/);

    // Results page shows response count
    await page.goto(`${origin}/surveys/${surveyId}/results`);
    await expect(page.getByText('Responses: 1')).toBeVisible();

    // Export endpoint returns at least one response
    const exportRes = await page.request.get(`${origin}/api/surveys/${surveyId}/export?limit=10`);
    expect(exportRes.ok()).toBeTruthy();
    const exportBody = (await exportRes.json()) as { responses: unknown[] };
    expect(Array.isArray(exportBody.responses)).toBeTruthy();
    expect(exportBody.responses.length).toBeGreaterThan(0);
  });
});
