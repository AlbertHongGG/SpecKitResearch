import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const REQUEST_ID_HEADER = "x-request-id";

export function getOrCreateRequestId(req: NextRequest): string {
  const incoming = req.headers.get(REQUEST_ID_HEADER);
  return incoming && incoming.trim().length > 0 ? incoming : crypto.randomUUID();
}

export function attachRequestId(res: NextResponse, requestId: string): NextResponse {
  res.headers.set(REQUEST_ID_HEADER, requestId);
  return res;
}
