import { NextResponse } from "next/server";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import type { Actor } from "@/src/domain/policies/rbac";
import { listAuditLogs } from "@/src/usecases/admin/audit/listAuditLogs";

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
  const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(req.nextUrl.searchParams.get("pageSize") ?? "50");
  const targetType = req.nextUrl.searchParams.get("targetType") ?? undefined;
  const targetId = req.nextUrl.searchParams.get("targetId") ?? undefined;

  const auth = await getAuthContext(req, prisma);
  const actor = toActor(auth);

  const result = await listAuditLogs(prisma, actor, { page, pageSize, targetType, targetId });
  return NextResponse.json(result);
});
