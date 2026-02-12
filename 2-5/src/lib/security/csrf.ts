import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/errors/apiError";
import { CSRF_COOKIE, csrfCookieOptions } from "@/lib/auth/cookies";

function b64url(buf: Buffer) {
  return buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function randomToken(bytes = 32) {
  return b64url(Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))));
}

function getSecret() {
  const secret = process.env.CSRF_SECRET;
  if (!secret) throw ApiError.internal("CSRF_SECRET 未設定");
  return secret;
}

function sign(payload: string) {
  const h = createHmac("sha256", getSecret());
  h.update(payload);
  return b64url(h.digest());
}

export function issueCsrfToken(sessionId: string | null) {
  const token = randomToken(32);
  const sid = sessionId ?? "anon";
  const payload = `${sid}:${token}`;
  const sig = sign(payload);
  const value = `${token}.${sig}`;

  const cookieStore = cookies();
  cookieStore.set(CSRF_COOKIE, value, csrfCookieOptions());

  return value;
}

export function verifyCsrfToken(value: string, sessionId: string | null) {
  const [token, sig] = value.split(".");
  if (!token || !sig) throw ApiError.forbidden("CSRF token 無效");

  const sid = sessionId ?? "anon";
  const payload = `${sid}:${token}`;
  const expected = sign(payload);

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw ApiError.forbidden("CSRF token 無效");
  }
}
