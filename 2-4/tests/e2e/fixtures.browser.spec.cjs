const { readFileSync } = require('node:fs');
const { existsSync, createReadStream } = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { test, expect } = require('@playwright/test');

function contentTypeForPath(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (p.endsWith('.json')) return 'application/json; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);

      const requested = pathname === '/' ? '/tests/e2e/fixtures.html' : pathname;
      const filePath = path.normalize(path.join(rootDir, requested));
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(400);
        res.end('Bad request');
        return;
      }

      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      res.writeHead(200, { 'content-type': contentTypeForPath(filePath) });
      createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(500);
      res.end('Internal error');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${addr.port}`,
      });
    });
  });
}

test('logic-engine fixtures match in browser (US1)', async ({ page }) => {
  const rootDir = path.resolve(__dirname, '../..');
  const { server, url } = await startStaticServer(rootDir);

  await page.goto(`${url}/tests/e2e/fixtures.html`);
  await page.waitForFunction(() => typeof window.__computeVisibleQuestions === 'function');

  const fixturePath = path.join(rootDir, 'packages/logic-engine/fixtures/us1.json');
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));

  const results = await page.evaluate((fx) => {
    const fn = window.__computeVisibleQuestions;
    return fx.vectors.map((v) => ({ name: v.name, result: fn(fx.snapshot, v.answers) }));
  }, fixture);

  for (const r of results) {
    const expected = fixture.vectors.find((v) => v.name === r.name)?.expected;
    expect(r.result, r.name).toEqual(expected);
  }

  await new Promise((resolve) => server.close(resolve));
});
