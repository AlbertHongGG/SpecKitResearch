import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { route } from "@/src/lib/http/route";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { searchThreads } from "@/src/usecases/search/searchThreads";

const querySchema = z.object({
  q: z.string().trim().min(1).max(200),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const page = url.searchParams.get("page");
  const pageSize = url.searchParams.get("pageSize");

  const parsed = querySchema.safeParse({
    q: q ?? "",
    page: page ?? undefined,
    pageSize: pageSize ?? undefined,
  });

  if (!parsed.success) {
    throw new AppError(ErrorCodes.ValidationError, "Validation failed", {
      issues: parsed.error.issues,
    });
  }

  const result = await searchThreads(prisma, parsed.data.q, parsed.data.page, parsed.data.pageSize);
  return NextResponse.json(result);
});
