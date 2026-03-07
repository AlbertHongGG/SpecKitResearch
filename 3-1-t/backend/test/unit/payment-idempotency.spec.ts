import { ConflictException, NotFoundException } from '@nestjs/common';

import { claimPaymentCallback } from '../../src/modules/payments/idempotency';

describe('payment-idempotency', () => {
  it('throws not found when payment missing', async () => {
    const prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as any;

    await expect(
      claimPaymentCallback({
        prisma,
        paymentId: 'p1',
        orderId: 'o1',
        transactionId: 'tx-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns DUPLICATE for same transaction id', async () => {
    const prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          orderId: 'o1',
          transactionId: 'tx-1',
        }),
      },
    } as any;

    await expect(
      claimPaymentCallback({
        prisma,
        paymentId: 'p1',
        orderId: 'o1',
        transactionId: 'tx-1',
      }),
    ).resolves.toEqual({ kind: 'DUPLICATE', paymentId: 'p1' });
  });

  it('returns CONFLICT for different transaction id on claimed payment', async () => {
    const prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          orderId: 'o1',
          transactionId: 'tx-old',
        }),
      },
    } as any;

    await expect(
      claimPaymentCallback({
        prisma,
        paymentId: 'p1',
        orderId: 'o1',
        transactionId: 'tx-new',
      }),
    ).resolves.toEqual({ kind: 'CONFLICT', paymentId: 'p1' });
  });

  it('claims callback when payment has no transaction id yet', async () => {
    const prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          orderId: 'o1',
          transactionId: null,
        }),
        update: jest.fn().mockResolvedValue({ id: 'p1' }),
      },
    } as any;

    await expect(
      claimPaymentCallback({
        prisma,
        paymentId: 'p1',
        orderId: 'o1',
        transactionId: 'tx-new',
      }),
    ).resolves.toEqual({ kind: 'CLAIMED', paymentId: 'p1' });
    expect(prisma.payment.update).toHaveBeenCalledTimes(1);
  });

  it('throws conflict when concurrent callback claims first', async () => {
    const prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          orderId: 'o1',
          transactionId: null,
        }),
        update: jest.fn().mockRejectedValue(new Error('unique violation')),
      },
    } as any;

    await expect(
      claimPaymentCallback({
        prisma,
        paymentId: 'p1',
        orderId: 'o1',
        transactionId: 'tx-new',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
