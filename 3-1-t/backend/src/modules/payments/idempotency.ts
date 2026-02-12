import { ConflictException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export type PaymentCallbackClaimResult =
  | { kind: 'CLAIMED'; paymentId: string }
  | { kind: 'DUPLICATE'; paymentId: string }
  | { kind: 'CONFLICT'; paymentId: string };

export async function claimPaymentCallback(params: {
  prisma: PrismaService;
  paymentId: string;
  orderId: string;
  transactionId: string;
}): Promise<PaymentCallbackClaimResult> {
  const payment = await params.prisma.payment.findUnique({
    where: {
      id: params.paymentId,
    },
  });

  if (!payment || payment.orderId !== params.orderId) {
    throw new NotFoundException('Payment not found');
  }

  if (payment.transactionId) {
    if (payment.transactionId === params.transactionId) {
      return { kind: 'DUPLICATE', paymentId: payment.id };
    }
    return { kind: 'CONFLICT', paymentId: payment.id };
  }

  try {
    await params.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        transactionId: params.transactionId,
      },
    });
  } catch (_err) {
    throw new ConflictException('Duplicate payment callback');
  }

  return { kind: 'CLAIMED', paymentId: payment.id };
}
