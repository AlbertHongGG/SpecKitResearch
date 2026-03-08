import { z } from 'zod';
import { OrdersCreateRequestSchema, PayPagePayRequestSchema } from '@app/contracts';

export const OrdersCreateBodySchema = OrdersCreateRequestSchema;

export const OrdersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(200).default(20),
  status: z.string().optional(),
  payment_method: z.string().optional(),
  simulation_scenario: z.string().optional(),
});

export const OrderIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const OrderNoParamsSchema = z.object({
  order_no: z.string().min(1),
});

export const PayPagePayBodySchema = PayPagePayRequestSchema;
