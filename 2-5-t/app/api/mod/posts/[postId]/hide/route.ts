import { NextResponse } from "next/server";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import type { Actor } from "@/src/domain/policies/rbac";
import { hidePost } from "@/src/usecases/moderation/postVisibility";

export const POST = route(async (req, ctx) => {
  const auth = await getAuthContext(req, prisma);

  const actor: Actor = auth.authenticated
    ? {
        authenticated: true,
        user: { id: auth.user.id, role: auth.user.role },
        moderatorBoards: auth.moderatorBoards,
      }
    : { authenticated: false };

  const result = await hidePost(prisma, actor, ctx.params.postId);
  return NextResponse.json(result);
});
