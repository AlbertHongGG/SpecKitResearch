import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import { validateJson } from "@/src/lib/http/validate";
import type { Actor } from "@/src/domain/policies/rbac";
import { createReport } from "@/src/usecases/reports/createReport";

const schema = z.object({
  targetType: z.enum(["thread", "post"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(1).max(2_000),
});

export const POST = route(async (req) => {
  const body = await validateJson(req, schema);
  const auth = await getAuthContext(req, prisma);

  const actor: Actor = auth.authenticated
    ? {
        authenticated: true,
        user: { id: auth.user.id, role: auth.user.role },
        moderatorBoards: auth.moderatorBoards,
      }
    : { authenticated: false };

  const result = await createReport(prisma, actor, body);
  return NextResponse.json(result);
});
