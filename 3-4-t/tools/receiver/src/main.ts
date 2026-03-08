import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import { verifyWebhook } from './webhook_verify';

type ReceivedItem = {
  at: string;
  path: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  query: any;
  body: any;
  webhook_verification?: { ok: boolean; reason?: string };
};

const app = Fastify({ logger: true });
await app.register(formbody);

const history: ReceivedItem[] = [];

function push(item: ReceivedItem) {
  history.unshift(item);
  if (history.length > 200) history.pop();
}

app.get('/health', async () => ({ ok: true }));

app.get('/history', async () => ({ items: history }));

app.all('/callback', async (request, reply) => {
  const item: ReceivedItem = {
    at: new Date().toISOString(),
    path: '/callback',
    method: request.method,
    headers: request.headers,
    query: request.query,
    body: request.body,
  };
  push(item);

  reply.type('text/html');
  return `<!doctype html><html><body>
<h1>Receiver: /callback</h1>
<pre>${escapeHtml(JSON.stringify({ query: item.query, body: item.body }, null, 2))}</pre>
</body></html>`;
});

app.all('/webhook', async (request) => {
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  const verification = secret
    ? verifyWebhook({
        secret,
        body: request.body,
        headers: request.headers,
      })
    : { ok: false as const, reason: 'missing_env_secret' as const };

  const item: ReceivedItem = {
    at: new Date().toISOString(),
    path: '/webhook',
    method: request.method,
    headers: request.headers,
    query: request.query,
    body: request.body,
    webhook_verification: verification.ok ? { ok: true } : { ok: false, reason: verification.reason },
  };
  push(item);
  return { ok: true };
});

const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 4000);

await app.listen({ host, port });

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
