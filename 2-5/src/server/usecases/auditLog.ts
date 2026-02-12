import type { Viewer } from "@/lib/auth/session";
import { writeAuditLog } from "@/server/repositories/auditLogRepository";

function toJsonString(value: unknown): string {
  if (value === undefined) return "{}";
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

export async function audit(
  viewer: Viewer | null,
  req: Request,
  entry: { action: string; targetType: string; targetId: string; metadata?: any },
) {
  const ip = req.headers.get("x-forwarded-for") ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  await writeAuditLog({
    actorId: viewer?.user.id ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadata: toJsonString(entry.metadata),
    ip,
    userAgent,
  });
}
