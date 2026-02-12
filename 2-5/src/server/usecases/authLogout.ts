import { deleteSessionRow } from "@/server/repositories/sessionRepository";

export async function authLogout(input: { sessionId: string }) {
  await deleteSessionRow(input.sessionId);
  return { ok: true };
}
