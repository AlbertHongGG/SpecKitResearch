import type { Prisma } from "@prisma/client";
import type { WriteAuditInput } from "@/src/infra/repos/auditRepo";
import { writeAudit } from "@/src/infra/repos/auditRepo";

export async function writeAuditInTx(tx: Prisma.TransactionClient, input: WriteAuditInput) {
  return writeAudit(tx, input);
}
