import { NextResponse } from "next/server";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import type { Actor } from "@/src/domain/policies/rbac";
import { unbanUser } from "@/src/usecases/admin/users/unbanUser";

function toActor(auth: Awaited<ReturnType<typeof getAuthContext>>): Actor {
  return auth.authenticated
    ? {
        authenticated: true,
        user: { id: auth.user.id, role: auth.user.role },
        moderatorBoards: auth.moderatorBoards,
      }
    : { authenticated: false };
}

export const POST = route(async (req, ctx: any) => {
  const auth = await getAuthContext(req, prisma);
  const actor = toActor(auth);

  const result = await unbanUser(prisma, actor, ctx.params.userId);
  return NextResponse.json(result);
});
