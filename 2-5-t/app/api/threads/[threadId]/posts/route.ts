import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import { validateJson } from "@/src/lib/http/validate";
import type { Actor } from "@/src/domain/policies/rbac";
import { createPost } from "@/src/usecases/posts/createPost";
import { listPostsPage } from "@/src/usecases/posts/listPostsPage";

export const GET = route(async (req, ctx) => {
  const { threadId } = ctx.params;
  const cursor = req.nextUrl.searchParams.get("cursor");
  const result = await listPostsPage(prisma, threadId, { cursor });
  return NextResponse.json(result);
});

const createSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
});

export const POST = route(async (req, ctx) => {
  const body = await validateJson(req, createSchema);
  const auth = await getAuthContext(req, prisma);

  const actor: Actor = auth.authenticated
    ? { authenticated: true, user: { id: auth.user.id, role: auth.user.role }, moderatorBoards: auth.moderatorBoards }
    : { authenticated: false };

  const result = await createPost(prisma, actor, { threadId: ctx.params.threadId, content: body.content });
  return NextResponse.json(result);
});

