import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import { validateJson } from "@/src/lib/http/validate";
import type { Actor } from "@/src/domain/policies/rbac";
import { listModerators } from "@/src/usecases/admin/moderators/listModerators";
import { assignModerator } from "@/src/usecases/admin/moderators/assignModerator";
import { unassignModerator } from "@/src/usecases/admin/moderators/unassignModerator";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";

const schema = z.object({
  boardId: z.string().min(1),
  userEmail: z.string().trim().email(),
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
  const boardId = req.nextUrl.searchParams.get("boardId");
  if (!boardId) throw new AppError(ErrorCodes.ValidationError, "boardId is required");

  const auth = await getAuthContext(req, prisma);
  const actor = toActor(auth);

  const result = await listModerators(prisma, actor, { boardId });
  return NextResponse.json(result);
});

export const POST = route(async (req) => {
  const body = await validateJson(req, schema);
  const auth = await getAuthContext(req, prisma);
  const actor = toActor(auth);

  const result = await assignModerator(prisma, actor, body);
  return NextResponse.json(result);
});

export const DELETE = route(async (req) => {
  const body = await validateJson(req, schema);
  const auth = await getAuthContext(req, prisma);
  const actor = toActor(auth);

  const result = await unassignModerator(prisma, actor, body);
  return NextResponse.json(result);
});
