import { NextResponse } from "next/server";
import { route } from "@/src/lib/http/route";
import { prisma } from "@/src/infra/db/prisma";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";

export const GET = route(async (req) => {
  const auth = await getAuthContext(req, prisma);
  return NextResponse.json(auth);
});
