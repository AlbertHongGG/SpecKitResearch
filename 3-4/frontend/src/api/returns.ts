import { apiFetch } from './http';
import { withCsrfHeaders } from './csrf';

export async function recordClientSignal(returnLogId: string, signal?: 'navigation_started' | 'form_submitted') {
  return apiFetch<{ ok: true }>(`/api/returns/${encodeURIComponent(returnLogId)}/client-signal`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ signal, user_agent: navigator.userAgent }),
    keepalive: true,
  });
}

export async function ackReturn(returnLogId: string, note?: string) {
  return apiFetch<{ ok: true }>(`/api/returns/${encodeURIComponent(returnLogId)}/ack`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note }),
    keepalive: true,
  });
}
