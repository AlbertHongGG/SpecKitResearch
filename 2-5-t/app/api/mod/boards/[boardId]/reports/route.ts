import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import type { Actor } from "@/src/domain/policies/rbac";
import { listReports } from "@/src/usecases/reports/listReports";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";

const statusSchema = z.enum(["pending", "accepted", "rejected"]);

export const GET = route(async (req, ctx) => {
  const auth = await getAuthContext(req, prisma);

  const actor: Actor = auth.authenticated
    ? {
        authenticated: true,
        user: { id: auth.user.id, role: auth.user.role },
        moderatorBoards: auth.moderatorBoards,
      }
    : { authenticated: false };

  const rawStatus = req.nextUrl.searchParams.get("status") ?? undefined;
  const parsedStatus = rawStatus ? statusSchema.safeParse(rawStatus) : { success: true as const, data: undefined };
  if (!parsedStatus.success) {
    throw new AppError(ErrorCodes.ValidationError, "Invalid status");
  }

  const result = await listReports(prisma, actor, {
    boardId: ctx.params.boardId,
    status: parsedStatus.data,
  });
  return NextResponse.json(result);
});
