import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import { validateJson } from "@/src/lib/http/validate";
import type { Actor } from "@/src/domain/policies/rbac";
import { editPost } from "@/src/usecases/posts/editPost";

const schema = z.object({
  content: z.string().trim().min(1).max(20_000),
});

export const PATCH = route(async (req, ctx) => {
  const body = await validateJson(req, schema);
  const auth = await getAuthContext(req, prisma);

  const actor: Actor = auth.authenticated
    ? { authenticated: true, user: { id: auth.user.id, role: auth.user.role }, moderatorBoards: auth.moderatorBoards }
    : { authenticated: false };

  const result = await editPost(prisma, actor, { postId: ctx.params.postId, content: body.content });
  return NextResponse.json(result);
});
