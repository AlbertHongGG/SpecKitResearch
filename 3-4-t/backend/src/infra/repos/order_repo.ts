import type { Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class OrderRepository {
  constructor(private prisma: DbClient) {}

  async create(data: {
    order_no: string;
    user_id: string;
    amount: number;
    currency: string;
    status: string;
    callback_url: string;
    return_method: string;
    webhook_url?: string | null;
    payment_method_code: string;
    simulation_scenario_type: string;
    delay_sec: number;
    webhook_delay_sec?: number | null;
    error_code?: string | null;
    error_message?: string | null;
  }) {
    return this.prisma.order.create({ data });
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({ where: { id } });
  }

  async findByOrderNo(orderNo: string) {
    return this.prisma.order.findUnique({ where: { order_no: orderNo } });
  }

  async updateStatus(params: { id: string; status: string; completed_at?: Date | null }) {
    return this.prisma.order.update({
      where: { id: params.id },
      data: { status: params.status, completed_at: params.completed_at ?? undefined },
    });
  }

  async list(params: {
    userId?: string;
    page: number;
    pageSize: number;
    status?: string;
    paymentMethod?: string;
    scenario?: string;
  }) {
    const where: any = {};
    if (params.userId) where.user_id = params.userId;
    if (params.status) where.status = params.status;
    if (params.paymentMethod) where.payment_method_code = params.paymentMethod;
    if (params.scenario) where.simulation_scenario_type = params.scenario;

    const [totalItems, items] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / params.pageSize));
    return { items, page: params.page, pageSize: params.pageSize, totalItems, totalPages };
  }
}
