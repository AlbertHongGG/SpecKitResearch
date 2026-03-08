import type { Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class OrderLogsRepository {
  constructor(private prisma: DbClient) {}

  async addStateEvent(data: {
    order_id: string;
    from_status?: string | null;
    to_status: string;
    trigger: string;
    actor_type: string;
    actor_user_id?: string | null;
    meta?: any;
  }) {
    return this.prisma.orderStateEvent.create({
      data: {
        order_id: data.order_id,
        from_status: data.from_status ?? null,
        to_status: data.to_status,
        trigger: data.trigger,
        actor_type: data.actor_type,
        actor_user_id: data.actor_user_id ?? null,
        meta: data.meta ?? null,
      },
    });
  }

  async addReturnLog(data: {
    order_id: string;
    replay_run_id?: string | null;
    delivery_method: string;
    callback_url: string;
    payload: any;
    success: boolean;
    error_message?: string | null;
  }) {
    return this.prisma.returnLog.create({
      data: {
        order_id: data.order_id,
        replay_run_id: data.replay_run_id ?? null,
        delivery_method: data.delivery_method,
        callback_url: data.callback_url,
        payload: data.payload,
        success: data.success,
        error_message: data.error_message ?? null,
      },
    });
  }
}
