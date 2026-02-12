import { test, expect } from '@playwright/test';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

function repoRoot(): string {
  return process.cwd();
}

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

test.describe('US2 admin draft authoring (e2e)', () => {
  let api: SpawnedServer | null = null;
  let web: SpawnedServer | null = null;
  const apiPort = 4020;
  let webPort = 3000;

  test.beforeAll(async (_args, testInfo) => {
    testInfo.setTimeout(140_000);
    const root = repoRoot();

    webPort = await getFreePort();

    const tmp = mkdtempSync(path.join(os.tmpdir(), 'dynamic-survey-e2e-us2-'));
    const dbPath = path.join(tmp, 'e2e.db');

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

    execSync(`node prisma/seed.js`, {
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
    if (api) {
      console.log(`\n[api logs]\n${api.getLog()}\n`);
    }
    if (web) {
      console.log(`\n[web logs]\n${web.getLog()}\n`);
    }
  });

  test.afterAll(async () => {
    killProcessTree(web?.child ?? null);
    killProcessTree(api?.child ?? null);
  });

  test('create a draft, add questions/options/rules, save', async ({ page }, testInfo) => {
    testInfo.setTimeout(140_000);
    const origin = `http://localhost:${webPort}`;

    await page.goto(`${origin}/login?return_to=/surveys`);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/\/surveys/);

    await expect(page.getByRole('heading', { name: 'Surveys', exact: true })).toBeVisible();

    const uniqueSlug = `e2e-us2-${Date.now()}`;

    const createSection = page.locator('section', { hasText: 'Create draft' });
    await createSection.getByLabel('Slug').fill(uniqueSlug);
    await createSection.getByLabel('Title').fill('E2E US2 Draft');
    await createSection.getByRole('button', { name: 'Create' }).click();

    await page.waitForURL(/\/surveys\/[0-9a-f-]{36}\/edit/);
    await expect(page.getByRole('heading', { name: 'Edit draft' })).toBeVisible();

    // Add Q1
    await page.getByRole('button', { name: 'Add question' }).click();
    await expect(page.locator('div.border-zinc-900')).toBeVisible();

    const selectedQuestion = page.locator('div.border-zinc-900');
    await selectedQuestion.getByLabel('Title').fill('Do you have a pet?');
    await selectedQuestion.getByLabel('Type').selectOption('SingleChoice');
    await selectedQuestion.getByLabel('Required').check();

    // Add options for Q1
    const optionsSection = page.locator('section', { hasText: 'Options' });
    await optionsSection.getByRole('button', { name: 'Add option' }).click();
    await optionsSection.getByRole('button', { name: 'Add option' }).click();

    await optionsSection.getByLabel('Label').nth(0).fill('Yes');
    await optionsSection.getByLabel('Value').nth(0).fill('yes');
    await optionsSection.getByLabel('Label').nth(1).fill('No');
    await optionsSection.getByLabel('Value').nth(1).fill('no');

    // Add Q2
    await page.getByRole('button', { name: 'Add question' }).click();
    const selectedQuestion2 = page.locator('div.border-zinc-900');
    await selectedQuestion2.getByLabel('Title').fill("What's your pet's name?");
    await selectedQuestion2.getByLabel('Type').selectOption('Text');
    await selectedQuestion2.getByLabel('Required').check();

    // Add rule group: show Q2 if Q1 equals 'yes'
    const ruleGroupSection = page.locator('section', { hasText: 'Rule groups' });
    await ruleGroupSection.getByRole('button', { name: 'Add group' }).click();

    await ruleGroupSection.getByLabel('Target question').selectOption("Q2: What's your pet's name?");
    await ruleGroupSection.getByLabel('Action').selectOption('show');
    await ruleGroupSection.getByLabel('Group operator').selectOption('AND');

    await ruleGroupSection.getByLabel('Source question').selectOption('Q1: Do you have a pet?');
    await ruleGroupSection.getByLabel('Operator').nth(1).selectOption('equals');
    await ruleGroupSection.getByLabel('Value').fill('yes');

    // Save
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await expect(page.getByText('Validation errors')).toHaveCount(0);

    // Basic preview smoke
    await page.getByRole('link', { name: 'Preview' }).click();
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
    await expect(page.getByText('Visible questions')).toBeVisible();
  });
});
