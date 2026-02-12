import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { route } from "@/src/lib/http/route";
import { validateJson } from "@/src/lib/http/validate";
import type { Actor } from "@/src/domain/policies/rbac";
import { resolveReport } from "@/src/usecases/reports/resolveReport";

const schema = z.object({
  action: z.enum(["accept", "reject"]),
  note: z.string().max(2_000).optional(),
});

export const POST = route(async (req, ctx) => {
  const body = await validateJson(req, schema);
  const auth = await getAuthContext(req, prisma);

  const actor: Actor = auth.authenticated
    ? {
        authenticated: true,
        user: { id: auth.user.id, role: auth.user.role },
        moderatorBoards: auth.moderatorBoards,
      }
    : { authenticated: false };

  const result = await resolveReport(prisma, actor, ctx.params.reportId, body);
  return NextResponse.json(result);
});
