import { URLSearchParams } from 'node:url';
import type { ReturnPayload } from '@app/contracts';

export class ReturnDispatchService {
  buildDispatch(params: {
    method: 'query_string' | 'post_form';
    callbackUrl: string;
    payload: ReturnPayload;
  }) {
    if (params.method === 'query_string') {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params.payload)) {
        if (v === undefined || v === null) continue;
        qs.set(k, String(v));
      }
      const separator = params.callbackUrl.includes('?') ? '&' : '?';
      const redirectUrl = `${params.callbackUrl}${separator}${qs.toString()}`;
      return { redirectUrl };
    }

    const inputs = Object.entries(params.payload)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(String(v))}" />`)
      .join('');

    const formHtml = `<!doctype html><html><body>
<form id="f" method="post" action="${escapeHtml(params.callbackUrl)}">${inputs}</form>
<script>document.getElementById('f').submit()</script>
</body></html>`;
    return { formHtml };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
