import { apiFetch } from '@/services/http';

export type UsageLog = {
  api_key_id: string;
  endpoint_id: string | null;
  http_method: string;
  path: string;
  status_code: number;
  response_time_ms: number;
  timestamp: string;
};

export type UsageStats = {
  unauthorized_401_count: number;
  forbidden_403_count: number;
  rate_limited_429_count: number;
  server_error_5xx_count: number;
};

export type UsageLogsParams = {
  from: string;
  to: string;
  status_code?: number;
  endpoint?: string;
};

function toQuery(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export function usageLogsQueryKey(params: UsageLogsParams) {
  return ['usage-logs', params] as const;
}

export async function fetchUsageLogs(params: UsageLogsParams): Promise<UsageLog[]> {
  return apiFetch<UsageLog[]>(`/usage-logs${toQuery(params)}`);
}

export type UsageStatsParams = {
  from: string;
  to: string;
  endpoint?: string;
};

export function usageStatsQueryKey(params: UsageStatsParams) {
  return ['usage-stats', params] as const;
}

export async function fetchUsageStats(params: UsageStatsParams): Promise<UsageStats> {
  return apiFetch<UsageStats>(`/usage-stats${toQuery(params)}`);
}
