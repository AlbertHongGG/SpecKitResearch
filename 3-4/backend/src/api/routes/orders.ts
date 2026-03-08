import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { requireAuth } from '../plugins/requireAuth.js';
import { getOrderDetail, getOrderByOrderNo, listOrdersByUser, createOrder as repoCreateOrder } from '../../repositories/orderRepo.js';
import { toOrderDto, toOrderStateEventDto, toReturnLogDto, toWebhookLogDto, toReplayRunDto, toAuditLogDto } from '../serializers.js';
import { getEnabledPaymentMethod, getEnabledScenarioTemplate, getSystemSettings, resolveScenarioOverrides, assertHttpUrl } from '../../services/orders/scenario.js';
import { createEndpointIfMissing } from '../../repositories/webhookEndpointRepo.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { audit } from '../../services/audit/AuditService.js';
import { sendWebhookOnceNow } from '../../jobs/webhookWorker.js';
import { createReplay } from '../../services/replay/ReplayService.js';
import { getPrisma } from '../../lib/db.js';

const CreateOrderRequestSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().default('TWD'),
  callback_url: z.string(),
  webhook_url: z.string().nullable().optional(),
  payment_method_code: z.string().min(1),
  simulation_scenario: z.enum(['success', 'failed', 'cancelled', 'timeout', 'delayed_success']),
  delay_sec: z.number().int().min(0).optional(),
  webhook_delay_sec: z.number().int().min(0).nullable().optional(),
  error_code: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
});

export const ordersRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', async (request) => {
    const user = requireAuth(request);
    const body = CreateOrderRequestSchema.parse(request.body);

    assertHttpUrl(body.callback_url, 'callback_url');
    if (body.webhook_url) assertHttpUrl(body.webhook_url, 'webhook_url');

    const settings = await getSystemSettings();
    const allowed = Array.isArray(settings.allowedCurrencies) ? (settings.allowedCurrencies as any[]) : [];
    if (!allowed.includes(body.currency)) {
      throw badRequest('VALIDATION_ERROR', 'currency 不在 allowed_currencies');
    }

    await getEnabledPaymentMethod(body.payment_method_code);
    const tpl = await getEnabledScenarioTemplate(body.simulation_scenario);

    const resolved = resolveScenarioOverrides({
      scenario: body.simulation_scenario,
      template: tpl,
      overrides: {
        delaySec: body.delay_sec,
        webhookDelaySec: body.webhook_delay_sec ?? null,
        errorCode: body.error_code ?? null,
        errorMessage: body.error_message ?? null,
      },
    });

    let webhookEndpointCreated: any = null;
    let webhookEndpointId: string | null = null;

    if (body.webhook_url) {
      const created = await createEndpointIfMissing({
        userId: user.id,
        url: body.webhook_url,
        graceSec: settings.webhookSecretGraceSecDefault,
      });
      webhookEndpointId = created.endpointId;
      if (created.created) {
        webhookEndpointCreated = {
          id: created.endpointId,
          url: body.webhook_url,
          signing_secret_current: created.signingSecretCurrent,
        };
      }
    }

    const orderNo = `ORD_${crypto.randomUUID().slice(0, 8)}`;

    const order = await repoCreateOrder({
      userId: user.id,
      orderNo,
      amount: body.amount,
      currency: body.currency,
      callbackUrl: body.callback_url,
      returnMethod: settings.defaultReturnMethod,
      paymentMethodCode: body.payment_method_code,
      simulationScenario: body.simulation_scenario,
      delaySec: resolved.delaySec,
      webhookDelaySec: resolved.webhookDelaySec,
      errorCode: resolved.errorCode,
      errorMessage: resolved.errorMessage,
      webhookUrl: body.webhook_url ?? null,
      webhookEndpointId,
    });

    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'order.create',
      targetType: 'order',
      targetId: order.id,
      requestId: request.requestId,
      meta: { order_no: order.orderNo },
    });

    return {
      order: toOrderDto(order),
      payment_page_url: `/pay/${order.orderNo}`,
      webhook_endpoint_created: webhookEndpointCreated,
    };
  });

  app.get('/', async (request) => {
    const user = requireAuth(request);
    const query = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        status: z.enum(['created', 'payment_pending', 'paid', 'failed', 'cancelled', 'timeout']).optional(),
        payment_method_code: z.string().min(1).optional(),
        simulation_scenario: z.enum(['success', 'failed', 'cancelled', 'timeout', 'delayed_success']).optional(),
        created_at_from: z.coerce.date().optional(),
        created_at_to: z.coerce.date().optional(),
      })
      .parse(request.query);

    const pageSize = 20;
    const prisma = getPrisma();

    const filters = {
      status: query.status,
      paymentMethodCode: query.payment_method_code,
      simulationScenario: query.simulation_scenario,
      createdAtFrom: query.created_at_from,
      createdAtTo: query.created_at_to,
    };

    const { items, total } =
      user.role === 'ADMIN'
        ? await (async () => {
            const where: any = {};
            if (filters.status) where.status = filters.status;
            if (filters.paymentMethodCode) where.paymentMethodCode = filters.paymentMethodCode;
            if (filters.simulationScenario) where.simulationScenario = filters.simulationScenario;
            if (filters.createdAtFrom || filters.createdAtTo) {
              where.createdAt = {
                ...(filters.createdAtFrom ? { gte: filters.createdAtFrom } : null),
                ...(filters.createdAtTo ? { lte: filters.createdAtTo } : null),
              };
            }

            const [items, total] = await Promise.all([
              prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * pageSize,
                take: pageSize,
              }),
              prisma.order.count({ where }),
            ]);
            return { items, total };
          })()
        : await listOrdersByUser({
            userId: user.id,
            page: query.page,
            pageSize,
            status: filters.status,
            paymentMethodCode: filters.paymentMethodCode,
            simulationScenario: filters.simulationScenario,
            createdAtFrom: filters.createdAtFrom,
            createdAtTo: filters.createdAtTo,
          });

    return {
      items: items.map(toOrderDto),
      page: query.page,
      page_size: pageSize,
      total,
    };
  });

  app.get('/:order_no', async (request) => {
    const user = requireAuth(request);
    const params = z.object({ order_no: z.string().min(1) }).parse(request.params);

    const detail = await getOrderDetail(params.order_no);
    if (!detail) throw notFound();

    if (detail.userId !== user.id && user.role !== 'ADMIN') {
      throw forbidden();
    }

    const prisma = getPrisma();
    const auditLogs = await prisma.auditLog.findMany({
      where: { targetType: 'order', targetId: detail.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return {
      order: toOrderDto(detail),
      state_events: detail.events.map(toOrderStateEventDto),
      return_logs: detail.returnLogs.map(toReturnLogDto),
      webhook_logs: detail.webhookLogs.map(toWebhookLogDto),
      replay_runs: detail.replayRuns.map(toReplayRunDto),
      audit_logs: auditLogs.map(toAuditLogDto),
    };
  });

  app.post('/:order_no/resend-webhook', async (request) => {
    const user = requireAuth(request);
    const params = z.object({ order_no: z.string().min(1) }).parse(request.params);

    const order = await getOrderByOrderNo(params.order_no);
    if (!order) throw notFound();

    if (order.userId !== user.id && user.role !== 'ADMIN') throw forbidden();

    if (!order.webhookUrl || !order.webhookEndpointId) {
      throw badRequest('WEBHOOK_NOT_CONFIGURED', 'Order has no webhook_url');
    }

    const prisma = getPrisma();
    const last = await prisma.webhookLog.findFirst({
      where: { orderId: order.id },
      orderBy: { sentAt: 'desc' },
    });

    const eventId = last?.eventId ?? crypto.randomUUID();

    const sent = await sendWebhookOnceNow({
      orderId: order.id,
      webhookEndpointId: order.webhookEndpointId,
      url: order.webhookUrl,
      eventId,
    });

    if (!sent) throw badRequest('WEBHOOK_SEND_FAILED', 'Failed to send webhook');

    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'webhook.resend',
      targetType: 'order',
      targetId: order.id,
      requestId: request.requestId,
      meta: { event_id: eventId },
    });

    return { ok: true, webhook_log_id: sent.webhookLogId };
  });

  app.post('/:order_no/replay', async (request) => {
    const user = requireAuth(request);
    const params = z.object({ order_no: z.string().min(1) }).parse(request.params);
    const body = z.object({ scope: z.enum(['webhook_only', 'full_flow']) }).parse(request.body);

    const order = await getOrderByOrderNo(params.order_no);
    if (!order) throw notFound();
    if (order.userId !== user.id && user.role !== 'ADMIN') throw forbidden();

    const run = await createReplay({
      orderNo: order.orderNo,
      scope: body.scope,
      createdByUserId: user.id,
    });

    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'order.replay',
      targetType: 'order',
      targetId: order.id,
      requestId: request.requestId,
      meta: { replay_run_id: run.id, scope: body.scope },
    });

    return { ok: true, replay_run_id: run.id };
  });
};
