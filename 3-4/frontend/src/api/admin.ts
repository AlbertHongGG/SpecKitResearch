import { apiFetch } from './http';
import { withCsrfHeaders } from './csrf';
import type { PaymentMethod, ScenarioTemplate } from './catalog';

export type SystemSettings = {
  allowed_currencies: string[];
  default_return_method: 'query_string' | 'post_form';
  session_idle_sec: number;
  session_absolute_sec: number;
  webhook_secret_grace_sec_default: number;
};

export async function adminListPaymentMethods() {
  return apiFetch<{ items: PaymentMethod[] }>(`/api/admin/payment-methods`);
}

export async function adminCreatePaymentMethod(input: {
  code: string;
  display_name: string;
  enabled: boolean;
  sort_order: number;
}) {
  return apiFetch<PaymentMethod>(`/api/admin/payment-methods`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(input),
  });
}

export async function adminUpdatePaymentMethod(code: string, input: Partial<{ display_name: string; enabled: boolean; sort_order: number }>) {
  return apiFetch<PaymentMethod>(`/api/admin/payment-methods/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    headers: withCsrfHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(input),
  });
}

export async function adminListScenarioTemplates() {
  return apiFetch<{ items: ScenarioTemplate[] }>(`/api/admin/scenario-templates`);
}

export async function adminCreateScenarioTemplate(input: {
  scenario: ScenarioTemplate['scenario'];
  enabled: boolean;
  default_delay_sec: number;
  default_error_code?: string | null;
  default_error_message?: string | null;
}) {
  return apiFetch<ScenarioTemplate>(`/api/admin/scenario-templates`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(input),
  });
}

export async function adminUpdateScenarioTemplate(
  scenario: ScenarioTemplate['scenario'],
  input: Partial<{ enabled: boolean; default_delay_sec: number; default_error_code: string | null; default_error_message: string | null }>,
) {
  return apiFetch<ScenarioTemplate>(`/api/admin/scenario-templates/${encodeURIComponent(scenario)}`, {
    method: 'PATCH',
    headers: withCsrfHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(input),
  });
}

export async function adminGetSystemSettings() {
  return apiFetch<SystemSettings>(`/api/admin/system-settings`);
}

export async function adminUpdateSystemSettings(input: Partial<SystemSettings>) {
  return apiFetch<SystemSettings>(`/api/admin/system-settings`, {
    method: 'PATCH',
    headers: withCsrfHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(input),
  });
}
