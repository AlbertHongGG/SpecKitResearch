export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-session" : "session";

export const CSRF_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-csrf" : "csrf";

export const CSRF_HEADER_NAME = "x-csrf-token";
