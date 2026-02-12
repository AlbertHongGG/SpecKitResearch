import { NextResponse } from "next/server";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import type { Actor } from "@/src/domain/policies/rbac";
import { lockThread } from "@/src/usecases/moderation/threadLock";

export const POST = route(async (req, ctx) => {
  const auth = await getAuthContext(req, prisma);

  const actor: Actor = auth.authenticated
    ? {
        authenticated: true,
        user: { id: auth.user.id, role: auth.user.role },
        moderatorBoards: auth.moderatorBoards,
      }
    : { authenticated: false };

  const result = await lockThread(prisma, actor, ctx.params.threadId);
  return NextResponse.json(result);
});
