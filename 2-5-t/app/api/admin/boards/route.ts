import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import { validateJson } from "@/src/lib/http/validate";
import type { Actor } from "@/src/domain/policies/rbac";
import { listBoardsAdmin } from "@/src/usecases/admin/boards/listBoardsAdmin";
import { createBoard } from "@/src/usecases/admin/boards/createBoard";

const createSchema = z.object({
  name: z.string().trim().min(1),
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

export const GET = route(async (req) => {
  const auth = await getAuthContext(req, prisma);
  const actor = toActor(auth);
  const result = await listBoardsAdmin(prisma, actor);
  return NextResponse.json(result);
});

export const POST = route(async (req) => {
  const body = await validateJson(req, createSchema);
  const auth = await getAuthContext(req, prisma);
  const actor = toActor(auth);
  const result = await createBoard(prisma, actor, body);
  return NextResponse.json(result);
});
