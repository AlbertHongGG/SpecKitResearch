const DEFAULT_CORS_ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:5174"];

export function getAllowedCorsOrigins() {
  const configured = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (configured.length === 0) {
    return DEFAULT_CORS_ALLOWED_ORIGINS;
  }

  return configured;
}

export function isOriginAllowed(origin: string) {
  const allowed = getAllowedCorsOrigins();
  return allowed.includes(origin);
}
