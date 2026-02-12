import { PrismaService } from '../../prisma/prisma.service';

export async function markPaymentNeedsCompensation(_params: {
  prisma: PrismaService;
  paymentId: string;
  reason: string;
}) {
  return;
}
