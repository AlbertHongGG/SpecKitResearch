import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type PublicSurvey = {
  publish_hash: string;
  survey: { id: string; slug: string; title: string };
  questions: Array<{ id: string; title: string; order: number }>;
};

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

describe('POST /responses validation errors (e2e)', () => {
  let apiProc: ChildProcess | null = null;
  const apiPort = 4010;
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
    let log = '';
    const append = (chunk: unknown) => {
      const s = typeof chunk === 'string' ? chunk : Buffer.isBuffer(chunk) ? chunk.toString('utf8') : '';
      if (!s) return;
      log = (log + s).slice(-8_000);
    };

    apiProc.on('exit', (code, signal) => {
      didExit = true;
      exitInfo.code = code;
      exitInfo.signal = signal;
    });

    apiProc.stdout?.on('data', append);
    apiProc.stderr?.on('data', append);

    const url = `${baseUrl}/public/surveys/demo-survey`;
    const start = Date.now();
    while (true) {
      if (didExit) {
        throw new Error(`API process exited early (code=${exitInfo.code} signal=${exitInfo.signal}). Logs:\n${log}`);
      }
      try {
        const res = await fetch(url);
        if (res.ok) break;
      } catch {
        // ignore
      }
      if (Date.now() - start > 30_000) {
        throw new Error(`Timed out waiting for API to be ready at ${url}. Logs:\n${log}`);
      }
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

  async function loadPublicSurvey(): Promise<PublicSurvey> {
    const res = await fetch(`${baseUrl}/public/surveys/demo-survey`);
    assert.equal(res.status, 200);
    return (await res.json()) as PublicSurvey;
  }

  it('rejects missing required visible answers with 422 VALIDATION_ERROR', async () => {
    const survey = await loadPublicSurvey();
    const q1 = survey.questions.find((q) => q.order === 1);
    const q2 = survey.questions.find((q) => q.order === 2);
    assert.ok(q1 && q2);

    const res = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({
        survey_id: survey.survey.id,
        publish_hash: survey.publish_hash,
        answers: [{ question_id: q1.id, value: 'yes' }],
      }),
    });

    assert.equal(res.status, 422);
    const body = (await res.json()) as ValidationError;
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.some((e) => e.path === `answers.${q2.id}` && e.message === 'Required'));
  });

  it('rejects answers for hidden questions with a locatable field-path error', async () => {
    const survey = await loadPublicSurvey();
    const q1 = survey.questions.find((q) => q.order === 1);
    const q2 = survey.questions.find((q) => q.order === 2);
    assert.ok(q1 && q2);

    const res = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({
        survey_id: survey.survey.id,
        publish_hash: survey.publish_hash,
        answers: [
          { question_id: q1.id, value: 'no' },
          { question_id: q2.id, value: 'Buddy' },
        ],
      }),
    });

    assert.equal(res.status, 422);
    const body = (await res.json()) as ValidationError;
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.some((e) => e.path === 'answers[1].question_id' && e.message.includes('hidden question')));
  });
});
