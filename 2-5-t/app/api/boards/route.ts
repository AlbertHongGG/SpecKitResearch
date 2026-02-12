import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { route } from "@/src/lib/http/route";
import { listBoards } from "@/src/usecases/boards/listBoards";

export const GET = route(async () => {
  const result = await listBoards(prisma);
  return NextResponse.json(result);
});
