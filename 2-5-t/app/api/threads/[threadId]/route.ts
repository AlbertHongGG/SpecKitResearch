import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import { validateJson } from "@/src/lib/http/validate";
import type { Actor } from "@/src/domain/policies/rbac";
import { getThread } from "@/src/usecases/threads/getThread";
import { updateDraft } from "@/src/usecases/threads/updateDraft";

export const GET = route(async (_req, ctx) => {
  const { threadId } = ctx.params;
  const result = await getThread(prisma, threadId);
  return NextResponse.json(result);
});

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(20_000).optional(),
});

export const PATCH = route(async (req, ctx) => {
  const body = await validateJson(req, patchSchema);
  const auth = await getAuthContext(req, prisma);

  const actor: Actor = auth.authenticated
    ? { authenticated: true, user: { id: auth.user.id, role: auth.user.role }, moderatorBoards: auth.moderatorBoards }
    : { authenticated: false };

  const result = await updateDraft(prisma, actor, {
    threadId: ctx.params.threadId,
    title: body.title,
    content: body.content,
  });
  return NextResponse.json(result);
});
