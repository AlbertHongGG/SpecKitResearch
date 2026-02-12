const isProd = process.env.NODE_ENV === "production";

// NOTE: `__Host-` cookies require `Secure` and HTTPS.
// In local dev/E2E (http://localhost) browsers reject them, so we fall back to
// plain names outside production.
export const SESSION_COOKIE = isProd ? "__Host-session" : "session";
export const CSRF_COOKIE = isProd ? "__Host-csrf" : "csrf";

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };
}

export function csrfCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };
}
