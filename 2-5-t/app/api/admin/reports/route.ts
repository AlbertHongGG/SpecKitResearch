import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import type { Actor } from "@/src/domain/policies/rbac";
import { listReportsAdmin } from "@/src/usecases/admin/reports/listReportsAdmin";

const statusSchema = z.enum(["pending", "accepted", "rejected"]);

function toActor(auth: Awaited<ReturnType<typeof getAuthContext>>): Actor {
  return auth.authenticated
    ? {
        authenticated: true,
        user: { id: auth.user.id, role: auth.user.role },
        moderatorBoards: auth.moderatorBoards,
      }
    : { authenticated: false };
}

export const GET = route(async (req) => {
  const statusRaw = req.nextUrl.searchParams.get("status") ?? undefined;
  const status = statusRaw ? statusSchema.parse(statusRaw) : undefined;
  const boardId = req.nextUrl.searchParams.get("boardId") ?? undefined;
  const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(req.nextUrl.searchParams.get("pageSize") ?? "50");

  const auth = await getAuthContext(req, prisma);
  const actor = toActor(auth);

  const result = await listReportsAdmin(prisma, actor, { status, boardId, page, pageSize });
  return NextResponse.json(result);
});
