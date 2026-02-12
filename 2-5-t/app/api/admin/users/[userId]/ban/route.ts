import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import { validateJson } from "@/src/lib/http/validate";
import type { Actor } from "@/src/domain/policies/rbac";
import { banUser } from "@/src/usecases/admin/users/banUser";

const schema = z.object({
  reason: z.string().trim().max(2000).optional(),
});

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
  const body = await validateJson(req, schema);
  const auth = await getAuthContext(req, prisma);
  const actor = toActor(auth);

  const result = await banUser(prisma, actor, ctx.params.userId, body);
  return NextResponse.json(result);
});
