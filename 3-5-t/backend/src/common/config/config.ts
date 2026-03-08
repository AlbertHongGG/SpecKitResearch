import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  API_KEY_PEPPER: z.string().min(16),
  SESSION_COOKIE_NAME: z.string().min(1).default('sid'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_MIN_LENGTH: z.coerce.number().int().positive().default(12),
  UPSTREAM_ALLOWLIST_HOSTS: z.string().default('localhost,127.0.0.1'),
  LOG_LEVEL: z.string().default('info'),
  USAGE_QUEUE_MAX: z.coerce.number().int().positive().default(10_000),
  AUDIT_QUEUE_MAX: z.coerce.number().int().positive().default(5_000),
  LOG_FLUSH_INTERVAL_MS: z.coerce.number().int().positive().default(500),
  RATE_LIMIT_CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  // Backward-compatible default retention (applied to MINUTE window if the new vars are not provided)
  RATE_LIMIT_COUNTER_RETENTION_HOURS: z.coerce.number().int().positive().default(6),
  // Preferred granular retention controls
  RATE_LIMIT_COUNTER_RETENTION_MINUTE_HOURS: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_COUNTER_RETENTION_HOUR_DAYS: z.coerce.number().int().positive().optional(),
});

export type AppConfig = {
  nodeEnv: z.infer<typeof EnvSchema>['NODE_ENV'];
  port: number;
  databaseUrl: string;
  apiKeyPepper: string;
  sessionCookieName: string;
  sessionTtlDays: number;
  passwordMinLength: number;
  upstreamAllowlistHosts: string[];
  logLevel: string;
  usageQueueMax: number;
  auditQueueMax: number;
  logFlushIntervalMs: number;
  rateLimitCleanupIntervalMs: number;
  rateLimitCounterRetentionMinuteHours: number;
  rateLimitCounterRetentionHourDays: number;
};

function normalizeHost(input: string) {
  const trimmed = input.trim().toLowerCase().replace(/\.+$/, '');
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function isProbablyIpv6(raw: string) {
  // Heuristic: IPv6 literals contain 2+ colons. Host:port has exactly one.
  if (raw.startsWith('[')) return true;
  const colons = (raw.match(/:/g) ?? []).length;
  return colons >= 2;
}

function parseAllowlistEntry(rawEntry: string) {
  const trimmed = rawEntry.trim();
  if (!trimmed) throw new Error('Invalid UPSTREAM_ALLOWLIST_HOSTS entry');
  if (trimmed.includes('://')) throw new Error('Invalid UPSTREAM_ALLOWLIST_HOSTS entry');
  if (/[\s/@?#]/.test(trimmed)) throw new Error('Invalid UPSTREAM_ALLOWLIST_HOSTS entry');

  const asUrlHost = isProbablyIpv6(trimmed) && !trimmed.startsWith('[') ? `[${trimmed}]` : trimmed;

  let url: URL;
  try {
    url = new URL(`http://${asUrlHost}`);
  } catch {
    throw new Error('Invalid UPSTREAM_ALLOWLIST_HOSTS entry');
  }

  // Disallow sneaky path/query/hash parts.
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Invalid UPSTREAM_ALLOWLIST_HOSTS entry');
  }
  if (url.username || url.password) {
    throw new Error('Invalid UPSTREAM_ALLOWLIST_HOSTS entry');
  }

  const host = normalizeHost(url.hostname);
  const port = url.port || undefined;

  if (!(isValidHostname(host) || isValidIpv4(host) || isValidIpv6(host))) {
    throw new Error('Invalid UPSTREAM_ALLOWLIST_HOSTS entry');
  }

  // Canonical key: host only OR host:port (or [ipv6]:port).
  if (!port) return host;
  if (isValidIpv6(host)) return `[${host}]:${port}`;
  return `${host}:${port}`;
}

function isValidHostname(host: string) {
  // Allow localhost and standard DNS names.
  if (host === 'localhost') return true;
  if (host.length > 253) return false;
  // Reject labels that start/end with hyphen, and require at least one dot.
  if (!host.includes('.')) return false;
  const labels = host.split('.');
  return labels.every((l) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l));
}

function isValidIpv4(host: string) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false;
  return host.split('.').every((o) => {
    const n = Number(o);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

function isValidIpv6(host: string) {
  // Very small validation; URL parser will handle canonicalization.
  return /^[0-9a-f:]+$/i.test(host) && host.includes(':');
}

function parseUpstreamAllowlistHosts(raw: string) {
  const entries = raw.split(',').map(parseAllowlistEntry);
  return Array.from(new Set(entries));
}

export function getConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = EnvSchema.parse(env);
  const minuteHours = parsed.RATE_LIMIT_COUNTER_RETENTION_MINUTE_HOURS ?? parsed.RATE_LIMIT_COUNTER_RETENTION_HOURS;
  const hourDays = parsed.RATE_LIMIT_COUNTER_RETENTION_HOUR_DAYS ?? 7;
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    apiKeyPepper: parsed.API_KEY_PEPPER,
    sessionCookieName: parsed.SESSION_COOKIE_NAME,
    sessionTtlDays: parsed.SESSION_TTL_DAYS,
    passwordMinLength: parsed.PASSWORD_MIN_LENGTH,
    upstreamAllowlistHosts: parseUpstreamAllowlistHosts(parsed.UPSTREAM_ALLOWLIST_HOSTS),
    logLevel: parsed.LOG_LEVEL,
    usageQueueMax: parsed.USAGE_QUEUE_MAX,
    auditQueueMax: parsed.AUDIT_QUEUE_MAX,
    logFlushIntervalMs: parsed.LOG_FLUSH_INTERVAL_MS,
    rateLimitCleanupIntervalMs: parsed.RATE_LIMIT_CLEANUP_INTERVAL_MS,
    rateLimitCounterRetentionMinuteHours: minuteHours,
    rateLimitCounterRetentionHourDays: hourDays,
  };
}
