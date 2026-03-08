import type { FastifyPluginAsync } from 'fastify';
import { requireAdmin } from '../../middleware/authz';
import { parseBody } from '../../lib/validate';
import { SettingsService } from '../../domain/admin/settings_service';
import { AuditLogService } from '../../domain/audit/audit_log_service';
import { AdminSettingsSchema } from '../schemas/us4';

export const adminSettingsRoutes: FastifyPluginAsync = async (app) => {
  const service = new SettingsService(app.prisma);
  const audit = new AuditLogService(app.prisma);

  app.get('/settings', async (request, reply) => {
    requireAdmin(request, reply);
    const settings = await service.get();
    return { ok: true, requestId: request.id, data: settings };
  });

  app.put('/settings', async (request, reply) => {
    requireAdmin(request, reply);
    const input = parseBody(request, AdminSettingsSchema);
    const updated = await service.update(input);

    await audit.write({
      actor: { type: 'admin', userId: request.authUser!.id },
      action: 'admin.settings.update',
      target: { type: 'system_setting', id: 'all' },
      meta: {
        session_ttl_hours: updated.session_ttl_hours,
        allowed_currencies: updated.allowed_currencies,
        default_return_method: updated.default_return_method,
        webhook_signing: updated.webhook_signing,
      },
    });

    return { ok: true, requestId: request.id, data: updated };
  });
};
