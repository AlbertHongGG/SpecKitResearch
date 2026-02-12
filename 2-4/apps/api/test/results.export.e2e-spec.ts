import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

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

describe('Export pagination stability (e2e)', () => {
  let apiProc: ChildProcess | null = null;
  const apiPort = 4016;
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

  it('pages export with cutoff stability', async () => {
    const createRes = await fetch(`${baseUrl}/surveys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ slug: `export-${Date.now()}`, title: 'Export Survey', is_anonymous: true }),
    });
    assert.equal(createRes.status, 200);
    const createBody = (await createRes.json()) as { survey_id: string };

    const q1 = randomUUID();

    const updateRes = await fetch(`${baseUrl}/surveys/${createBody.survey_id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({
        patch: {
          questions: [
            {
              id: q1,
              type: 'Text',
              title: 'Your name',
              is_required: true,
              order: 1,
            },
          ],
          options: [],
          rule_groups: [],
        },
      }),
    });
    assert.equal(updateRes.status, 200);

    const publishRes = await fetch(`${baseUrl}/surveys/${createBody.survey_id}/publish`, {
      method: 'POST',
      headers: { cookie: sessionCookie },
    });
    assert.equal(publishRes.status, 200);
    const pub = (await publishRes.json()) as { publish_hash: string };
    assert.ok(pub.publish_hash);

    async function submit(value: string) {
      const res = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: sessionCookie },
        body: JSON.stringify({
          survey_id: createBody.survey_id,
          publish_hash: pub.publish_hash,
          answers: [{ question_id: q1, value }],
        }),
      });
      assert.equal(res.status, 200);
      return (await res.json()) as { response_id: string };
    }

    const r1 = await submit('a');
    const r2 = await submit('b');
    const r3 = await submit('c');

    const page1Res = await fetch(`${baseUrl}/surveys/${createBody.survey_id}/export?limit=2`, {
      headers: { cookie: sessionCookie },
    });
    assert.equal(page1Res.status, 200);
    const page1 = (await page1Res.json()) as { responses: Array<{ response_id: string }>; next_cursor?: string | null };
    assert.equal(page1.responses.length, 2);
    assert.ok(page1.next_cursor);

    const late = await submit('late');

    const page2Res = await fetch(
      `${baseUrl}/surveys/${createBody.survey_id}/export?limit=2&cursor=${encodeURIComponent(page1.next_cursor!)}`,
      {
        headers: { cookie: sessionCookie },
      },
    );
    assert.equal(page2Res.status, 200);
    const page2 = (await page2Res.json()) as { responses: Array<{ response_id: string }>; next_cursor?: string | null };

    const ids = new Set([...page1.responses.map((r) => r.response_id), ...page2.responses.map((r) => r.response_id)]);
    assert.equal(ids.size, page1.responses.length + page2.responses.length, 'Expected no duplicates across pages');

    assert.ok(ids.has(r1.response_id));
    assert.ok(ids.has(r2.response_id));
    assert.ok(ids.has(r3.response_id));

    // Cutoff stability: response created after page1 must not appear in subsequent pages.
    assert.ok(!ids.has(late.response_id));
  });
});
