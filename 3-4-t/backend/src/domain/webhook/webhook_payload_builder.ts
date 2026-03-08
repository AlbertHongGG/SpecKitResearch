import type { Prisma, PrismaClient } from '@prisma/client';
import { ErrorCode, type ReturnPayload } from '@app/contracts';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class WebhookPayloadBuilder {
  constructor(private prisma: DbClient) {}

  async buildForOrder(params: { orderId: string; replayRunId?: string | null }): Promise<ReturnPayload> {
    const returnLog = await this.prisma.returnLog.findFirst({
      where: {
        order_id: params.orderId,
        replay_run_id: params.replayRunId ?? null,
      },
      orderBy: { dispatched_at: 'desc' },
    });
    if (returnLog) {
      return returnLog.payload as ReturnPayload;
    }

    const order = await this.prisma.order.findUnique({ where: { id: params.orderId } });
    if (!order) {
      throw Object.assign(new Error('Not found'), { statusCode: 404, code: ErrorCode.NOT_FOUND });
    }
    if (!order.completed_at) {
      throw Object.assign(new Error('Order not completed'), { statusCode: 409, code: ErrorCode.CONFLICT });
    }

    return {
      order_no: order.order_no,
      status: order.status as any,
      amount: order.amount,
      currency: order.currency,
      completed_at: order.completed_at.toISOString(),
      error_code: order.error_code ?? null,
      error_message: order.error_message ?? null,
    };
  }
}
