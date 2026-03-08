import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http';

export type AdminPaymentMethod = {
  id: string;
  code: string;
  display_name: string;
  enabled: boolean;
  sort_order: number;
};

export type AdminScenarioTemplate = {
  type: string;
  default_delay_sec: number;
  default_error_code: string | null;
  default_error_message: string | null;
  enabled: boolean;
};

export type AdminSettings = {
  session_ttl_hours: number;
  allowed_currencies: string[];
  default_return_method: 'query_string' | 'post_form';
  webhook_signing: {
    active_secret_id: string;
    previous_secret_id?: string | null;
    previous_secret_grace_period_hours: number;
  };
};

export function useAdminPaymentMethodsQuery(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'payment-methods'],
    enabled: opts?.enabled ?? true,
    queryFn: async () => {
      const res = await apiFetch<{ items: AdminPaymentMethod[] }>(`/api/admin/payment-methods`);
      return res.data.items;
    },
  });
}

export function useAdminUpsertPaymentMethodMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { code: string; display_name: string; enabled: boolean; sort_order: number }) => {
      const res = await apiFetch<AdminPaymentMethod>(`/api/admin/payment-methods`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'payment-methods'] });
    },
  });
}

export function useAdminScenarioTemplatesQuery(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'scenario-templates'],
    enabled: opts?.enabled ?? true,
    queryFn: async () => {
      const res = await apiFetch<{ items: AdminScenarioTemplate[] }>(`/api/admin/scenario-templates`);
      return res.data.items;
    },
  });
}

export function useAdminUpsertScenarioTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminScenarioTemplate) => {
      const res = await apiFetch<AdminScenarioTemplate>(`/api/admin/scenario-templates`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'scenario-templates'] });
    },
  });
}

export function useAdminSettingsQuery(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'settings'],
    enabled: opts?.enabled ?? true,
    queryFn: async () => {
      const res = await apiFetch<AdminSettings>(`/api/admin/settings`);
      return res.data;
    },
  });
}

export function useAdminUpdateSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminSettings) => {
      const res = await apiFetch<AdminSettings>(`/api/admin/settings`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
  });
}
