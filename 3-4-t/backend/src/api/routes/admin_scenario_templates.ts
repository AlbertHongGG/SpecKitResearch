import type { FastifyPluginAsync } from 'fastify';
import { requireAdmin } from '../../middleware/authz';
import { parseBody } from '../../lib/validate';
import { ScenarioTemplateService } from '../../domain/admin/scenario_template_service';
import { AuditLogService } from '../../domain/audit/audit_log_service';
import { AdminScenarioTemplateUpsertBodySchema } from '../schemas/us4';

export const adminScenarioTemplatesRoutes: FastifyPluginAsync = async (app) => {
  const service = new ScenarioTemplateService(app.prisma);
  const audit = new AuditLogService(app.prisma);

  app.get('/scenario-templates', async (request, reply) => {
    requireAdmin(request, reply);
    const items = await service.list();
    const mapped = items.map((i) => ({
      type: i.type,
      default_delay_sec: i.default_delay_sec,
      default_error_code: i.default_error_code,
      default_error_message: i.default_error_message,
      enabled: i.enabled,
    }));
    return { ok: true, requestId: request.id, data: { items: mapped } };
  });

  app.put('/scenario-templates', async (request, reply) => {
    requireAdmin(request, reply);
    const input = parseBody(request, AdminScenarioTemplateUpsertBodySchema);
    const updated = await service.upsert({
      type: input.type,
      default_delay_sec: input.default_delay_sec,
      default_error_code: input.default_error_code ?? null,
      default_error_message: input.default_error_message ?? null,
      enabled: input.enabled,
    });

    await audit.write({
      actor: { type: 'admin', userId: request.authUser!.id },
      action: 'admin.scenario_template.upsert',
      target: { type: 'scenario_template', id: input.type },
      meta: {
        default_delay_sec: updated.default_delay_sec,
        enabled: updated.enabled,
      },
    });

    return {
      ok: true,
      requestId: request.id,
      data: {
        type: updated.type,
        default_delay_sec: updated.default_delay_sec,
        default_error_code: updated.default_error_code,
        default_error_message: updated.default_error_message,
        enabled: updated.enabled,
      },
    };
  });
};
