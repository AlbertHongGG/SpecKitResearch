export type ApiKey = {
  api_key_id: string;
  name: string;
  scopes: string[];
  status: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  replaced_by_key_id: string | null;
  rate_limit_per_minute: number | null;
  rate_limit_per_hour: number | null;
};
