import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

type ValidationError = {
  code: string;
  message: string;
  request_id?: string;
  errors?: Array<{ path: string; message: string }>;
};

function repoRoot(): string {
  // apps/api/test/* -> repo root
  return path.resolve(__dirname, '../../..');
}

function killProcessTree(child: ChildProcess | null) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    // ignore
  }
}

describe('PUT /surveys/{surveyId} rejects cycle rules (e2e)', () => {
  let apiProc: ChildProcess | null = null;
  const apiPort = 4012;
  const baseUrl = `http://localhost:${apiPort}`;
  let sessionCookie = '';

  before(async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'dynamic-survey-api-test-'));
    const dbPath = path.join(tmp, 'test.db');

    process.env.DATABASE_URL = `file:${dbPath}`;
    process.env.SESSION_SECRET = 'test-only';
    process.env.APP_BASE_URL = 'http://localhost:3000';
    process.env.PORT = String(apiPort);

    const root = repoRoot();
    const schemaPath = path.join(root, 'prisma', 'schema.prisma');

    execSync(`npx prisma db push --schema "${schemaPath}" --skip-generate`, {
      cwd: root,
      env: { ...process.env },
      stdio: 'inherit',
    });

    execSync(`node prisma/seed.js`, {
      cwd: root,
      env: { ...process.env },
      stdio: 'inherit',
    });

    apiProc = spawn('npm', ['-w', 'apps/api', 'run', 'start:test'], {
      cwd: root,
      env: { ...process.env },
      stdio: 'pipe',
      detached: true,
    });

    let didExit = false;
    const exitInfo: { code: number | null; signal: NodeJS.Signals | null } = { code: null, signal: null };
    apiProc.on('exit', (code, signal) => {
      didExit = true;
      exitInfo.code = code;
      exitInfo.signal = signal;
    });

    const url = `${baseUrl}/auth/session`;
    const start = Date.now();
    while (true) {
      if (didExit) throw new Error(`API process exited early (code=${exitInfo.code} signal=${exitInfo.signal})`);
      try {
        const res = await fetch(url);
        if (res.ok) break;
      } catch {
        // ignore
      }
      if (Date.now() - start > 30_000) throw new Error(`Timed out waiting for API to be ready at ${url}`);
      await new Promise((r) => setTimeout(r, 250));
    }

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'demo@example.com', password: 'demo1234', return_to: '/' }),
    });
    assert.ok(loginRes.ok, `Login failed: status=${loginRes.status}`);

    const cookieHeaderAccessor = loginRes.headers as unknown as { getSetCookie?: () => string[] };
    const setCookies =
      cookieHeaderAccessor.getSetCookie?.() ??
      (loginRes.headers.get('set-cookie') ? [loginRes.headers.get('set-cookie')!] : []);
    sessionCookie = setCookies.map((c) => c.split(';')[0]).join('; ');
    assert.ok(sessionCookie.includes('session='), 'Expected express-session session cookie');
  });

  after(async () => {
    killProcessTree(apiProc);
  });

  it('returns 422 VALIDATION_ERROR with cycle path info', async () => {
    const createRes = await fetch(`${baseUrl}/surveys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({
        slug: `draft-${Date.now()}`,
        title: 'Draft',
        is_anonymous: true,
      }),
    });
    assert.equal(createRes.status, 200);
    const createBody = (await createRes.json()) as { survey_id: string };
    assert.ok(createBody.survey_id);

    const q1 = randomUUID();
    const q2 = randomUUID();
    const g1 = randomUUID();
    const g2 = randomUUID();

    const updateRes = await fetch(`${baseUrl}/surveys/${createBody.survey_id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({
        patch: {
          questions: [
            { id: q1, type: 'Text', title: 'Q1', is_required: false, order: 1 },
            { id: q2, type: 'Text', title: 'Q2', is_required: false, order: 2 },
          ],
          options: [],
          rule_groups: [
            {
              id: g1,
              target_question_id: q2,
              action: 'show',
              group_operator: 'AND',
              rules: [{ id: randomUUID(), source_question_id: q1, operator: 'equals', value: 'x' }],
            },
            {
              id: g2,
              target_question_id: q1,
              action: 'show',
              group_operator: 'AND',
              rules: [{ id: randomUUID(), source_question_id: q2, operator: 'equals', value: 'x' }],
            },
          ],
        },
      }),
    });

    assert.equal(updateRes.status, 422);
    const body = (await updateRes.json()) as ValidationError;
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.some((e) => e.path === 'rule_groups' && e.message.includes('Cycle detected')));
  });
});
