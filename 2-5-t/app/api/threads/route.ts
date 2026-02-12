import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import { validateJson } from "@/src/lib/http/validate";
import type { Actor } from "@/src/domain/policies/rbac";
import { createDraft } from "@/src/usecases/threads/createDraft";

const schema = z.object({
  boardId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  content: z.string().max(20_000).optional(),
});

export const POST = route(async (req) => {
  const body = await validateJson(req, schema);
  const auth = await getAuthContext(req, prisma);

  const actor: Actor = auth.authenticated
    ? { authenticated: true, user: { id: auth.user.id, role: auth.user.role }, moderatorBoards: auth.moderatorBoards }
    : { authenticated: false };

  const result = await createDraft(prisma, actor, body);
  return NextResponse.json(result);
});
