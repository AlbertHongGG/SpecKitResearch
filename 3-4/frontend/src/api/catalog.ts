import { apiFetch } from './http';

export type PaymentMethod = {
  id: string;
  code: string;
  display_name: string;
  enabled: boolean;
  sort_order: number;
};

export type ScenarioTemplate = {
  id: string;
  scenario: 'success' | 'failed' | 'cancelled' | 'timeout' | 'delayed_success';
  enabled: boolean;
  default_delay_sec: number;
  default_error_code: string | null;
  default_error_message: string | null;
};

export async function listPaymentMethods() {
  return apiFetch<{ items: PaymentMethod[] }>('/api/payment-methods');
}

export async function listScenarioTemplates() {
  return apiFetch<{ items: ScenarioTemplate[] }>('/api/scenario-templates');
}
