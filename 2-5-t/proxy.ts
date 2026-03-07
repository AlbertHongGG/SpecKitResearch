import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getAllowedOrigins() {
  const appOrigin = process.env.APP_ORIGIN?.trim() || "http://localhost:5174";
  const extraOrigins = (process.env.APP_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set([appOrigin, ...extraOrigins]));
}

function applyCorsHeaders(req: NextRequest, res: NextResponse) {
  const requestOrigin = req.headers.get("origin");
  if (!requestOrigin) return res;

  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.includes(requestOrigin)) return res;

  res.headers.set("Access-Control-Allow-Origin", requestOrigin);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,PATCH,DELETE");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
  res.headers.set("Vary", "Origin");
  return res;
}

export function proxy(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return applyCorsHeaders(req, new NextResponse(null, { status: 204 }));
  }

  return applyCorsHeaders(req, NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*"],
};