import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';

type CookieJar = Record<string, string>;

function toArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function parseSetCookieHeader(setCookieValue: string) {
  const [pair] = setCookieValue.split(';', 1);
  if (!pair) return null;
  const idx = pair.indexOf('=');
  if (idx <= 0) return null;
  const name = pair.slice(0, idx).trim();
  const value = pair.slice(idx + 1);
  if (!name) return null;
  return { name, value };
}

export class TestClient {
  private readonly jar: CookieJar = {};

  constructor(private readonly app: FastifyInstance) {}

  getCookie(name: string) {
    return this.jar[name];
  }

  private updateCookiesFromResponse(res: LightMyRequestResponse) {
    const setCookie = toArray(res.headers['set-cookie'] as any);
    for (const v of setCookie) {
      if (typeof v !== 'string') continue;
      const parsed = parseSetCookieHeader(v);
      if (!parsed) continue;
      this.jar[parsed.name] = parsed.value;
    }
  }

  private buildCookieHeader() {
    const parts = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`);
    return parts.length ? parts.join('; ') : undefined;
  }

  async request(
    opts: Omit<InjectOptions, 'cookies'> & {
      withCsrf?: boolean;
      json?: unknown;
    },
  ) {
    const { withCsrf, json, ...injectBase } = opts;
    const headers: Record<string, any> = { ...(opts.headers ?? {}) };

    const cookieHeader = this.buildCookieHeader();
    if (cookieHeader) headers.cookie = cookieHeader;

    const method = (opts.method ?? 'GET').toString().toUpperCase();
    const isUnsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);

    if (withCsrf !== false && isUnsafe) {
      const csrf = this.getCookie('csrf_token');
      if (csrf) headers['x-csrf-token'] = csrf;
    }

    let payload = injectBase.payload;
    if (json !== undefined) {
      headers['content-type'] = 'application/json';
      payload = JSON.stringify(json);
    }

    const injectOpts: InjectOptions = {
      ...(injectBase as InjectOptions),
      headers,
      ...(payload !== undefined ? { payload } : {}),
    };

    const res = await this.app.inject(injectOpts);
    this.updateCookiesFromResponse(res);
    return res;
  }

  async login(email: string, password: string) {
    const res = await this.request({
      method: 'POST',
      url: '/api/auth/login',
      withCsrf: false,
      json: { email, password },
    });
    return res;
  }
}
