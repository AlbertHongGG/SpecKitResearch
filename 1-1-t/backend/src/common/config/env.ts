type Env = {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  TZ: string;
  FRONTEND_ORIGIN: string;
};

let cachedEnv: Env | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid env var ${name}: must be a positive number`);
  }
  return value;
}

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  cachedEnv = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: parseIntEnv('PORT', 3000),
    DATABASE_URL: requireEnv('DATABASE_URL'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
    TZ: process.env.TZ ?? 'Asia/Taipei',
    FRONTEND_ORIGIN:
      process.env.FRONTEND_ORIGIN ??
      'http://127.0.0.1:5173,http://localhost:5173',
  };

  return cachedEnv;
}
