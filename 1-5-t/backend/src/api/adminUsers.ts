import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseQuery } from './validation.js';
import { requireAuthenticatedUser } from '../auth/session.js';
import { requireRole } from '../auth/rbac.js';
import { adminUserService } from '../services/adminUserService.js';

const QuerySchema = z.object({ role: z.enum(['User', 'Reviewer', 'Admin']).optional() });

export async function registerAdminUsersRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: requireRole(['Admin']),
    },
    async (request) => {
      const user = requireAuthenticatedUser(request);
      const query = parseQuery(request, QuerySchema);
      const role = query.role ?? 'Reviewer';
      const users = await adminUserService.listUsersByRole(role);
      return { users: users.map((u) => ({ id: u.id, email: u.email, role: u.role })) };
    },
  );
}
