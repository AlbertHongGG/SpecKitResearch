import type { FastifyPluginAsync } from 'fastify';
import { requireAdmin } from '../../middleware/authz';
import { parseBody } from '../../lib/validate';
import { PaymentMethodService } from '../../domain/admin/payment_method_service';
import { AuditLogService } from '../../domain/audit/audit_log_service';
import { AdminPaymentMethodUpsertBodySchema } from '../schemas/us4';

export const adminPaymentMethodsRoutes: FastifyPluginAsync = async (app) => {
  const service = new PaymentMethodService(app.prisma);
  const audit = new AuditLogService(app.prisma);

  app.get('/payment-methods', async (request, reply) => {
    requireAdmin(request, reply);
    const items = await service.list();
    return { ok: true, requestId: request.id, data: { items } };
  });

  app.put('/payment-methods', async (request, reply) => {
    requireAdmin(request, reply);
    const input = parseBody(request, AdminPaymentMethodUpsertBodySchema);
    const updated = await service.upsert(input);

    await audit.write({
      actor: { type: 'admin', userId: request.authUser!.id },
      action: 'admin.payment_method.upsert',
      target: { type: 'payment_method', id: updated.code },
      meta: { enabled: updated.enabled, sort_order: updated.sort_order },
    });

    return { ok: true, requestId: request.id, data: updated };
  });
};
