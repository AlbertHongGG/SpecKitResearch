export type HttpPostJsonResult = {
  ok: boolean;
  status: number | null;
  durationMs: number;
  responseBodyExcerpt: string | null;
  errorSummary: string | null;
};

export async function postJsonWithTimeout(opts: {
  url: string;
  body: string;
  headers: Record<string, string>;
  timeoutMs: number;
  maxExcerptBytes: number;
}): Promise<HttpPostJsonResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);

  try {
    const res = await fetch(opts.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...opts.headers,
      },
      body: opts.body,
      signal: controller.signal,
    });

    const arrayBuf = await res.arrayBuffer().catch(() => null);
    let excerpt: string | null = null;
    if (arrayBuf) {
      const buf = Buffer.from(arrayBuf);
      excerpt = buf.subarray(0, opts.maxExcerptBytes).toString('utf8');
    }

    const durationMs = Date.now() - start;
    return {
      ok: res.ok,
      status: res.status,
      durationMs,
      responseBodyExcerpt: excerpt,
      errorSummary: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (e: any) {
    const durationMs = Date.now() - start;
    return {
      ok: false,
      status: null,
      durationMs,
      responseBodyExcerpt: null,
      errorSummary: e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e),
    };
  } finally {
    clearTimeout(timeout);
  }
}
