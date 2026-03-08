import { apiFetch } from './http';
import { withCsrfHeaders } from './csrf';

export type WebhookEndpoint = {
  id: string;
  url: string;
  grace_sec: number;
  last_rotated_at: string | null;
  previous_valid_until: string | null;
  secret_masked: string | null;
};

export async function listWebhookEndpoints() {
  return apiFetch<{ items: WebhookEndpoint[] }>(`/api/webhook-endpoints`);
}

export async function rotateWebhookSecret(endpointId: string) {
  return apiFetch<{ ok: true; endpoint: WebhookEndpoint; signing_secret_current: string }>(
    `/api/webhook-endpoints/${encodeURIComponent(endpointId)}/rotate-secret`,
    {
      method: 'POST',
      headers: withCsrfHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({}),
    },
  );
}
