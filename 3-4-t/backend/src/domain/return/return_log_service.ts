import type { Prisma, PrismaClient } from '@prisma/client';
import { OrderLogsRepository } from '../../infra/repos/order_logs_repo';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class ReturnLogService {
  constructor(private prisma: DbClient) {}

  async record(params: {
    orderId: string;
    replayRunId?: string | null;
    deliveryMethod: string;
    callbackUrl: string;
    payload: any;
    success: boolean;
    errorMessage?: string | null;
  }) {
    const logs = new OrderLogsRepository(this.prisma);
    return logs.addReturnLog({
      order_id: params.orderId,
      replay_run_id: params.replayRunId ?? null,
      delivery_method: params.deliveryMethod,
      callback_url: params.callbackUrl,
      payload: params.payload,
      success: params.success,
      error_message: params.errorMessage ?? null,
    });
  }
}
