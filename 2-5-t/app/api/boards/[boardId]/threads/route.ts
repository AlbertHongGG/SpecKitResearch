import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { route } from "@/src/lib/http/route";
import { listThreadsByBoard } from "@/src/usecases/threads/listThreadsByBoard";

function parseIntParam(value: string | null, fallback: number) {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const GET = route(async (req, ctx) => {
  const { boardId } = ctx.params;

  const url = new URL(req.url);
  const page = parseIntParam(url.searchParams.get("page"), 1);
  const pageSize = parseIntParam(url.searchParams.get("pageSize"), 20);

  const result = await listThreadsByBoard(prisma, boardId, page, pageSize);
  return NextResponse.json(result);
});
