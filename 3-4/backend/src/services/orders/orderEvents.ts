import { getPrisma } from '../../lib/db.js';
import type { OrderStatus } from '../../domain/order/orderStateMachine.js';
import { Prisma } from '@prisma/client';

export async function appendOrderStateEvent(input: {
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  trigger: string;
  actorType: 'user' | 'system' | 'admin';
  actorUserId?: string;
  meta?: unknown;
}) {
  const prisma = getPrisma();
  return prisma.orderStateEvent.create({
    data: {
      orderId: input.orderId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      trigger: input.trigger,
      actorType: input.actorType,
      actorUserId: input.actorUserId ?? null,
      meta: input.meta === undefined ? undefined : input.meta === null ? Prisma.JsonNull : (input.meta as Prisma.InputJsonValue),
      occurredAt: new Date(),
    },
  });
}
