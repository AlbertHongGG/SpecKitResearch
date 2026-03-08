import { z } from 'zod';
import { ErrorCode, OrdersCreateRequestSchema } from '@app/contracts';
import type { PrismaClient } from '@prisma/client';
import { OrderRepository } from '../../infra/repos/order_repo';
import { OrderLogsRepository } from '../../infra/repos/order_logs_repo';

export class OrdersService {
  private repo: OrderRepository;
  private logs: OrderLogsRepository;

  constructor(private prisma: PrismaClient) {
    this.repo = new OrderRepository(prisma);
    this.logs = new OrderLogsRepository(prisma);
  }

  async create(params: { userId: string; input: unknown }) {
    const input = OrdersCreateRequestSchema.parse(params.input);
    const amount = input.amount;
    const currency = input.currency ?? 'TWD';
    const delaySec = input.delay_sec ?? 0;

    const [allowedCurrenciesSetting, defaultReturnMethodSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: 'allowed_currencies' } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'default_return_method' } }),
    ]);

    const allowedCurrencies = z.array(z.string()).safeParse(allowedCurrenciesSetting?.value_json ?? ['TWD']);
    if (allowedCurrencies.success && !allowedCurrencies.data.includes(currency)) {
      throw Object.assign(new Error('Currency not allowed'), { statusCode: 400, code: ErrorCode.BAD_REQUEST });
    }

    const paymentMethod = await this.prisma.paymentMethod.findUnique({ where: { code: input.payment_method_code } });
    if (!paymentMethod || !paymentMethod.enabled) {
      throw Object.assign(new Error('Payment method disabled'), { statusCode: 400, code: ErrorCode.BAD_REQUEST });
    }

    const orderNo = `ORD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    const returnMethod =
      input.return_method ??
      (typeof defaultReturnMethodSetting?.value_json === 'string'
        ? (defaultReturnMethodSetting.value_json as string)
        : 'query_string');

    const order = await this.prisma.$transaction(async (tx) => {
      const repo = new OrderRepository(tx);
      const logs = new OrderLogsRepository(tx);
      const created = await repo.create({
        order_no: orderNo,
        user_id: params.userId,
        amount,
        currency,
        status: 'created',
        callback_url: input.callback_url,
        return_method: returnMethod,
        webhook_url: input.webhook_url ?? null,
        payment_method_code: input.payment_method_code,
        simulation_scenario_type: input.simulation_scenario_type,
        delay_sec: delaySec,
        webhook_delay_sec: input.webhook_delay_sec ?? null,
        error_code: input.error_code ?? null,
        error_message: input.error_message ?? null,
      });

      await logs.addStateEvent({
        order_id: created.id,
        from_status: null,
        to_status: 'created',
        trigger: 'create',
        actor_type: 'user',
        actor_user_id: params.userId,
      });
      return created;
    });

    return { order, payUrl: `/pay/${order.order_no}` };
  }

  async list(params: {
    userId: string;
    page: number;
    pageSize: number;
    status?: string;
    paymentMethod?: string;
    scenario?: string;
  }) {
    return this.repo.list({
      userId: params.userId,
      page: params.page,
      pageSize: params.pageSize,
      status: params.status,
      paymentMethod: params.paymentMethod,
      scenario: params.scenario,
    });
  }

  async getById(params: { requester: { id: string; role: string }; id: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: params.id },
      include: {
        state_events: { orderBy: { occurred_at: 'asc' } },
        return_logs: { orderBy: { dispatched_at: 'asc' } },
        webhook_logs: { orderBy: { sent_at: 'asc' } },
        replay_runs: { orderBy: { created_at: 'desc' } },
      },
    });
    if (!order) {
      throw Object.assign(new Error('Not found'), { statusCode: 404, code: ErrorCode.NOT_FOUND });
    }
    if (params.requester.role !== 'ADMIN' && order.user_id !== params.requester.id) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403, code: ErrorCode.FORBIDDEN });
    }
    return order;
  }
}
