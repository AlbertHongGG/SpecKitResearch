import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import { validateJson } from "@/src/lib/http/validate";
import type { Actor } from "@/src/domain/policies/rbac";
import { updateBoard } from "@/src/usecases/admin/boards/updateBoard";
import { deleteBoard } from "@/src/usecases/admin/boards/deleteBoard";

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
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

export const PATCH = route(async (req, ctx: any) => {
  const body = await validateJson(req, patchSchema);
  const auth = await getAuthContext(req, prisma);
  const actor = toActor(auth);
  const result = await updateBoard(prisma, actor, ctx.params.boardId, body);
  return NextResponse.json(result);
});

export const DELETE = route(async (req, ctx: any) => {
  const auth = await getAuthContext(req, prisma);
  const actor = toActor(auth);
  const result = await deleteBoard(prisma, actor, ctx.params.boardId);
  return NextResponse.json(result);
});
