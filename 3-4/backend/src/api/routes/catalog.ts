import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../plugins/requireAuth.js';
import { getPrisma } from '../../lib/db.js';
import { toPaymentMethodDto, toScenarioTemplateDto } from '../serializers.js';

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  app.get('/payment-methods', async (request) => {
    requireAuth(request);
    const prisma = getPrisma();
    const items = await prisma.paymentMethod.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { items: items.map(toPaymentMethodDto) };
  });

  app.get('/scenario-templates', async (request) => {
    requireAuth(request);
    const prisma = getPrisma();
    const items = await prisma.simulationScenarioTemplate.findMany({
      where: { enabled: true },
      orderBy: [{ scenario: 'asc' }],
    });
    return { items: items.map(toScenarioTemplateDto) };
  });
};
