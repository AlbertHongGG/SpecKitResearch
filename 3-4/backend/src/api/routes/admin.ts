import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../plugins/requireAuth.js';
import { getPrisma } from '../../lib/db.js';
import { toPaymentMethodDto, toScenarioTemplateDto } from '../serializers.js';
import { badRequest, notFound } from '../errors.js';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/payment-methods', async (request) => {
    requireAdmin(request);
    const prisma = getPrisma();
    const items = await prisma.paymentMethod.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return { items: items.map(toPaymentMethodDto) };
  });

  app.post('/payment-methods', async (request) => {
    requireAdmin(request);
    const body = z
      .object({
        code: z.string().min(1),
        display_name: z.string().min(1),
        enabled: z.boolean().default(true),
        sort_order: z.number().int().default(0),
      })
      .parse(request.body);

    const prisma = getPrisma();
    try {
      const pm = await prisma.paymentMethod.create({
        data: {
          code: body.code,
          displayName: body.display_name,
          enabled: body.enabled,
          sortOrder: body.sort_order,
        },
      });
      return toPaymentMethodDto(pm);
    } catch {
      throw badRequest('VALIDATION_ERROR', 'payment method create failed');
    }
  });

  app.patch('/payment-methods/:code', async (request) => {
    requireAdmin(request);
    const params = z.object({ code: z.string().min(1) }).parse(request.params);
    const body = z
      .object({
        display_name: z.string().min(1).optional(),
        enabled: z.boolean().optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(request.body);

    const prisma = getPrisma();
    const existing = await prisma.paymentMethod.findUnique({ where: { code: params.code } });
    if (!existing) throw notFound();

    const pm = await prisma.paymentMethod.update({
      where: { code: params.code },
      data: {
        displayName: body.display_name ?? undefined,
        enabled: body.enabled ?? undefined,
        sortOrder: body.sort_order ?? undefined,
      },
    });

    return toPaymentMethodDto(pm);
  });

  app.get('/scenario-templates', async (request) => {
    requireAdmin(request);
    const prisma = getPrisma();
    const items = await prisma.simulationScenarioTemplate.findMany({ orderBy: [{ scenario: 'asc' }] });
    return { items: items.map(toScenarioTemplateDto) };
  });

  app.post('/scenario-templates', async (request) => {
    requireAdmin(request);
    const body = z
      .object({
        scenario: z.enum(['success', 'failed', 'cancelled', 'timeout', 'delayed_success']),
        enabled: z.boolean().default(true),
        default_delay_sec: z.number().int().min(0).default(0),
        default_error_code: z.string().nullable().optional(),
        default_error_message: z.string().nullable().optional(),
      })
      .parse(request.body);

    const prisma = getPrisma();
    const tpl = await prisma.simulationScenarioTemplate.create({
      data: {
        scenario: body.scenario,
        enabled: body.enabled,
        defaultDelaySec: body.default_delay_sec,
        defaultErrorCode: body.default_error_code ?? null,
        defaultErrorMessage: body.default_error_message ?? null,
      },
    });
    return toScenarioTemplateDto(tpl);
  });

  app.patch('/scenario-templates/:scenario', async (request) => {
    requireAdmin(request);
    const params = z.object({ scenario: z.enum(['success', 'failed', 'cancelled', 'timeout', 'delayed_success']) }).parse(request.params);
    const body = z
      .object({
        enabled: z.boolean().optional(),
        default_delay_sec: z.number().int().min(0).optional(),
        default_error_code: z.string().nullable().optional(),
        default_error_message: z.string().nullable().optional(),
      })
      .parse(request.body);

    const prisma = getPrisma();
    const existing = await prisma.simulationScenarioTemplate.findUnique({ where: { scenario: params.scenario } });
    if (!existing) throw notFound();

    const tpl = await prisma.simulationScenarioTemplate.update({
      where: { scenario: params.scenario },
      data: {
        enabled: body.enabled ?? undefined,
        defaultDelaySec: body.default_delay_sec ?? undefined,
        defaultErrorCode: body.default_error_code === undefined ? undefined : body.default_error_code,
        defaultErrorMessage: body.default_error_message === undefined ? undefined : body.default_error_message,
      },
    });

    return toScenarioTemplateDto(tpl);
  });

  app.get('/system-settings', async (request) => {
    requireAdmin(request);
    const prisma = getPrisma();
    const s = await prisma.systemSettings.findUnique({ where: { id: 1 } });
    if (!s) throw notFound();
    return {
      allowed_currencies: s.allowedCurrencies,
      default_return_method: s.defaultReturnMethod,
      session_idle_sec: s.sessionIdleSec,
      session_absolute_sec: s.sessionAbsoluteSec,
      webhook_secret_grace_sec_default: s.webhookSecretGraceSecDefault,
    };
  });

  app.patch('/system-settings', async (request) => {
    requireAdmin(request);
    const body = z
      .object({
        allowed_currencies: z.array(z.string()).optional(),
        default_return_method: z.enum(['query_string', 'post_form']).optional(),
        session_idle_sec: z.number().int().min(60).optional(),
        session_absolute_sec: z.number().int().min(60).optional(),
        webhook_secret_grace_sec_default: z.number().int().min(0).optional(),
      })
      .parse(request.body);

    const prisma = getPrisma();
    const s = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {
        allowedCurrencies: body.allowed_currencies ?? undefined,
        defaultReturnMethod: body.default_return_method ?? undefined,
        sessionIdleSec: body.session_idle_sec ?? undefined,
        sessionAbsoluteSec: body.session_absolute_sec ?? undefined,
        webhookSecretGraceSecDefault: body.webhook_secret_grace_sec_default ?? undefined,
      },
      create: {
        id: 1,
        allowedCurrencies: body.allowed_currencies ?? ['TWD', 'USD', 'JPY'],
        defaultReturnMethod: body.default_return_method ?? 'query_string',
        sessionIdleSec: body.session_idle_sec ?? 28800,
        sessionAbsoluteSec: body.session_absolute_sec ?? 604800,
        webhookSecretGraceSecDefault: body.webhook_secret_grace_sec_default ?? 604800,
      },
    });

    return {
      allowed_currencies: s.allowedCurrencies,
      default_return_method: s.defaultReturnMethod,
      session_idle_sec: s.sessionIdleSec,
      session_absolute_sec: s.sessionAbsoluteSec,
      webhook_secret_grace_sec_default: s.webhookSecretGraceSecDefault,
    };
  });
};
