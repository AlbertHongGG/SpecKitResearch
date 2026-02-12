import type { Prisma } from "@prisma/client";

export type AuditTargetType = "system" | "board" | "thread" | "post" | "report" | "user";

export type WriteAuditInput = {
  actorId?: string | null;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
};

export async function writeAudit(tx: Prisma.TransactionClient, input: WriteAuditInput) {
  return tx.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
