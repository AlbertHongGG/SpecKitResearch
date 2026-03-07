import { PrismaService } from '../../prisma/prisma.service';
import { AuditActions } from '../../common/audit/audit-actions';

export async function markPaymentNeedsCompensation(params: {
  prisma: PrismaService;
  paymentId: string;
  reason: string;
  metadata?: unknown;
}) {
  const payment = await params.prisma.payment.findUnique({
    where: {
      id: params.paymentId,
    },
    select: {
      id: true,
      orderId: true,
      status: true,
      transactionId: true,
    },
  });

  if (!payment) {
    return { marked: false as const, paymentId: params.paymentId };
  }

  const audit = await params.prisma.auditLog.create({
    data: {
      actorRole: 'SYSTEM',
      action: AuditActions.PAYMENT_COMPENSATION_MARK,
      targetType: 'Payment',
      targetId: payment.id,
      metadata: JSON.stringify({
        reason: params.reason,
        orderId: payment.orderId,
        status: payment.status,
        transactionId: payment.transactionId,
        metadata: params.metadata ?? null,
      }),
    },
  });

  return {
    marked: true as const,
    paymentId: payment.id,
    auditId: audit.id,
  };
}
