import { stableJsonStringify } from '../../lib/stable_json';
import { WebhookSignatureService } from './webhook_signature_service';

export class WebhookSender {
  constructor(
    private signature: WebhookSignatureService,
    private opts: {
      timeoutMs?: number;
      userAgent?: string;
    } = {},
  ) {}

  async send(params: { url: string; payload: unknown; now: Date }) {
    const rawBody = stableJsonStringify(params.payload);
    const sig = await this.signature.sign({ rawBody, now: params.now });

    const controller = new AbortController();
    const timeoutMs = this.opts.timeoutMs ?? 8_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const requestHeaders: Record<string, string> = {
      'content-type': 'application/json',
      'user-agent': this.opts.userAgent ?? 'payment-flow-sim/0.1',
      ...sig.headers,
    };

    try {
      const res = await fetch(params.url, {
        method: 'POST',
        headers: requestHeaders,
        body: rawBody,
        signal: controller.signal,
      });
      const status = res.status;
      const bodyText = await safeReadText(res);
      const excerpt = bodyText ? bodyText.slice(0, 1024) : null;
      const success = status >= 200 && status < 300;
      return {
        ok: true as const,
        requestHeaders,
        rawBody,
        responseStatus: status,
        responseBodyExcerpt: excerpt,
        success,
      };
    } catch (e: any) {
      return {
        ok: false as const,
        requestHeaders,
        rawBody,
        errorMessage: e?.name === 'AbortError' ? 'timeout' : (e?.message ?? 'network_error'),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

async function safeReadText(res: Response) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
