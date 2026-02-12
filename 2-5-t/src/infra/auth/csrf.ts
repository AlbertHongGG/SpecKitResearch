import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { env } from "@/src/lib/env";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from "@/src/lib/http/cookieNames";

type CsrfPayload = {
  n: string; // nonce
  iat: number;
  sid?: string;
};

function base64UrlEncode(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(input: string) {
  const padded = input.replaceAll("-", "+").replaceAll("_", "/");
  const pad = "=".repeat((4 - (padded.length % 4)) % 4);
  return Buffer.from(padded + pad, "base64").toString("utf8");
}

function sign(payloadB64: string) {
  return base64UrlEncode(
    crypto.createHmac("sha256", env.CSRF_SECRET).update(payloadB64).digest(),
  );
}

export function mintCsrfToken(sessionId?: string) {
  const payload: CsrfPayload = {
    n: base64UrlEncode(crypto.randomBytes(16)),
    iat: Date.now(),
    ...(sessionId ? { sid: sessionId } : {}),
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyCsrfToken(token: string, sessionId?: string) {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;
  if (sign(payloadB64) !== sig) return false;

  let payload: CsrfPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64)) as CsrfPayload;
  } catch {
    return false;
  }

  if (payload.sid && sessionId && payload.sid !== sessionId) return false;
  if (payload.sid && !sessionId) return false;

  // Soft-expire after 2 hours.
  if (Date.now() - payload.iat > 2 * 60 * 60 * 1000) return false;

  return true;
}

function requireSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (origin) {
    if (origin !== env.APP_ORIGIN) {
      throw new AppError(ErrorCodes.Forbidden, "Cross-origin request blocked");
    }
    return;
  }

  if (referer) {
    try {
      const u = new URL(referer);
      if (u.origin !== env.APP_ORIGIN) {
        throw new AppError(ErrorCodes.Forbidden, "Cross-origin request blocked");
      }
      return;
    } catch {
      throw new AppError(ErrorCodes.Forbidden, "Invalid referer");
    }
  }

  // No origin signals; be strict for unsafe methods.
  throw new AppError(ErrorCodes.Forbidden, "Missing origin");
}

export function requireCsrf(req: NextRequest) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite.toLowerCase() === "cross-site") {
    throw new AppError(ErrorCodes.Forbidden, "Cross-site request blocked");
  }

  requireSameOrigin(req);

  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!headerToken || !cookieToken) {
    throw new AppError(ErrorCodes.Forbidden, "Missing CSRF token");
  }

  if (headerToken !== cookieToken) {
    throw new AppError(ErrorCodes.Forbidden, "Invalid CSRF token");
  }

  const sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifyCsrfToken(headerToken, sessionId)) {
    throw new AppError(ErrorCodes.Forbidden, "Invalid CSRF token");
  }
}
