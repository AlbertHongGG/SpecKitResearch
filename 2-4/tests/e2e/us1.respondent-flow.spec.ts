import { test, expect } from '@playwright/test';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

function repoRoot(): string {
  // Playwright is typically launched from the monorepo root.
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

test.describe('US1 respondent flow (e2e)', () => {
  let apiProc: ChildProcess | null = null;
  let webProc: ChildProcess | null = null;
  const apiPort = 4010;
  let webPort = 3000;

  test.beforeAll(async (_args, testInfo) => {
    testInfo.setTimeout(120_000);
    const root = repoRoot();

    webPort = await getFreePort();

    const tmp = mkdtempSync(path.join(os.tmpdir(), 'dynamic-survey-e2e-'));
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

    const api = spawnServer('api', 'npm', ['-w', 'apps/api', 'run', 'start:test'], { cwd: root, env: envApi });
    apiProc = api.child;
    await waitForUrlOk(`${apiOrigin}/public/surveys/demo-survey`, 60_000, api);

    const web = spawnServer('web', 'npx', ['--no-install', 'next', 'dev', '-p', String(webPort)], {
      cwd: path.join(root, 'apps/web'),
      env: envWeb,
    });
    webProc = web.child;
    await waitForUrlOk(`${webOrigin}/s/demo-survey`, 120_000, web);
  });

  test.afterAll(async () => {
    killProcessTree(webProc);
    killProcessTree(apiProc);
  });

  test('dynamic branch + back navigation + submit', async ({ page }, testInfo) => {
    testInfo.setTimeout(120_000);
    const origin = `http://localhost:${webPort}`;

    await page.goto(`${origin}/login?return_to=/s/demo-survey`);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await page.waitForURL(/\/s\/demo-survey/);
    await expect(page.getByRole('heading', { name: 'Demo Survey (Dynamic Logic)' })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Demo Survey (Dynamic Logic)' })).toBeVisible();
    await expect(page.getByText('Do you have a pet?')).toBeVisible();

    // Required enforcement (visible only)
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Required')).toBeVisible();

    // Choose Yes -> Q2 becomes visible
    await page.getByLabel('Yes').check();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText("What's your pet's name?")).toBeVisible();

    await page.getByPlaceholder('Type your answer').fill('Buddy');

    // Back to Q1, switch to No -> Q2 hidden and must be cleared
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect(page.getByText('Do you have a pet?')).toBeVisible();

    await page.getByLabel('No').check();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Q3 should be next (Q2 hidden)
    await expect(page.getByText('How much do you like animals? (1-5)')).toBeVisible();
    await page.getByRole('combobox').selectOption('5');

    await page.getByRole('button', { name: 'Submit', exact: true }).click();

    await page.waitForURL(/\/s\/demo-survey\/complete/);

    await expect(page.getByRole('heading', { name: 'Thanks!' })).toBeVisible();
    await expect(page.getByText('response_hash')).toBeVisible();
  });
});
