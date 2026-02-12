import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type ErrorBody = { code: string; message: string; request_id?: string };

function repoRoot(): string {
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

describe('Publish immutability (e2e)', () => {
  let apiProc: ChildProcess | null = null;
  const apiPort = 4014;
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

    execSync('node prisma/seed.js', {
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
      if (didExit) throw new Error(`API exited early (code=${exitInfo.code} signal=${exitInfo.signal})`);
      try {
        const res = await fetch(url);
        if (res.ok) break;
      } catch {
        // ignore
      }
      if (Date.now() - start > 30_000) throw new Error(`Timed out waiting for API at ${url}`);
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
    assert.ok(sessionCookie.includes('session='), 'Expected session cookie');
  });

  after(async () => {
    killProcessTree(apiProc);
  });

  it('locks structure after publish but allows title/description updates', async () => {
    const createRes = await fetch(`${baseUrl}/surveys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ slug: `draft-${Date.now()}`, title: 'Draft', is_anonymous: true }),
    });
    assert.equal(createRes.status, 200);
    const createBody = (await createRes.json()) as { survey_id: string };
    assert.ok(createBody.survey_id);

    const publishRes = await fetch(`${baseUrl}/surveys/${createBody.survey_id}/publish`, {
      method: 'POST',
      headers: { cookie: sessionCookie },
    });
    assert.equal(publishRes.status, 200);
    const pub = (await publishRes.json()) as { status: string; publish_hash: string };
    assert.equal(pub.status, 'Published');
    assert.ok(pub.publish_hash);

    const illegalUpdateRes = await fetch(`${baseUrl}/surveys/${createBody.survey_id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ patch: { questions: [] } }),
    });
    assert.equal(illegalUpdateRes.status, 409);
    const illegalBody = (await illegalUpdateRes.json()) as ErrorBody;
    assert.equal(illegalBody.code, 'CONFLICT');

    const metaUpdateRes = await fetch(`${baseUrl}/surveys/${createBody.survey_id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ patch: { title: 'Renamed' } }),
    });
    assert.equal(metaUpdateRes.status, 200);

    const republishRes = await fetch(`${baseUrl}/surveys/${createBody.survey_id}/publish`, {
      method: 'POST',
      headers: { cookie: sessionCookie },
    });
    assert.equal(republishRes.status, 409);
  });
});
