import { getPrisma } from '../lib/db.js';
import type { OrderStatus } from '../domain/order/orderStateMachine.js';

export async function createOrder(data: {
  userId: string;
  orderNo: string;
  amount: number;
  currency: string;
  callbackUrl: string;
  returnMethod: 'query_string' | 'post_form';
  paymentMethodCode: string;
  simulationScenario: 'success' | 'failed' | 'cancelled' | 'timeout' | 'delayed_success';
  delaySec: number;
  webhookDelaySec: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  webhookUrl: string | null;
  webhookEndpointId: string | null;
}) {
  const prisma = getPrisma();
  return prisma.order.create({
    data: {
      userId: data.userId,
      orderNo: data.orderNo,
      status: 'created',
      amount: data.amount,
      currency: data.currency,
      callbackUrl: data.callbackUrl,
      returnMethod: data.returnMethod,
      paymentMethodCode: data.paymentMethodCode,
      simulationScenario: data.simulationScenario,
      delaySec: data.delaySec,
      webhookDelaySec: data.webhookDelaySec,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      webhookUrl: data.webhookUrl,
      webhookEndpointId: data.webhookEndpointId,
    },
  });
}

export async function listOrdersByUser(input: {
  userId: string;
  page: number;
  pageSize: number;
  status?: OrderStatus;
  paymentMethodCode?: string;
  simulationScenario?: 'success' | 'failed' | 'cancelled' | 'timeout' | 'delayed_success';
  createdAtFrom?: Date;
  createdAtTo?: Date;
}) {
  const prisma = getPrisma();
  const where: any = { userId: input.userId };
  if (input.status) where.status = input.status;
  if (input.paymentMethodCode) where.paymentMethodCode = input.paymentMethodCode;
  if (input.simulationScenario) where.simulationScenario = input.simulationScenario;
  if (input.createdAtFrom || input.createdAtTo) {
    where.createdAt = {
      ...(input.createdAtFrom ? { gte: input.createdAtFrom } : null),
      ...(input.createdAtTo ? { lte: input.createdAtTo } : null),
    };
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total };
}

export async function getOrderByOrderNo(orderNo: string) {
  const prisma = getPrisma();
  return prisma.order.findUnique({ where: { orderNo } });
}

export async function getOrderDetail(orderNo: string) {
  const prisma = getPrisma();
  return prisma.order.findUnique({
    where: { orderNo },
    include: {
      events: { orderBy: { occurredAt: 'asc' } },
      returnLogs: { orderBy: { initiatedAt: 'desc' } },
      webhookLogs: { orderBy: { sentAt: 'desc' } },
      replayRuns: { orderBy: { startedAt: 'desc' } },
    },
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, completedAt: Date | null) {
  const prisma = getPrisma();
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      completedAt,
    },
  });
}
