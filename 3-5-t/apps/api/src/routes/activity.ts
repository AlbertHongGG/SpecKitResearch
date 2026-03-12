import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../http/auth/require-auth';
import { projectScopeWithPermission } from '../http/rbac/project-scope';
import { HttpError } from '../http/errors';

function encodeCursor(timestamp: string, id: string): string {
  return Buffer.from(JSON.stringify({ timestamp, id }), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { timestamp: string; id: string } {
  const raw = Buffer.from(cursor, 'base64url').toString('utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed.timestamp !== 'string' || typeof parsed.id !== 'string') {
    throw new HttpError(400, 'BAD_REQUEST', 'Invalid cursor');
  }
  return parsed;
}

export const activityRoutes: FastifyPluginAsync = async (app) => {
  const zQuery = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  });

  app.get(
    '/projects/:projectId/activity',
    { preHandler: [requireAuth, projectScopeWithPermission('activity:read')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const query = zQuery.parse(req.query);

      const cursor = query.cursor ? decodeCursor(query.cursor) : null;

      const where: any = { projectId };
      if (cursor) {
        where.OR = [
          { timestamp: { lt: new Date(cursor.timestamp) } },
          { timestamp: new Date(cursor.timestamp), id: { lt: cursor.id } },
        ];
      }

      const items = await app.prisma.activityLog.findMany({
        where,
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      });

      const page = items.slice(0, query.limit);
      const extra = items.length > query.limit ? items[query.limit] : null;

      return {
        items: page,
        nextCursor: extra ? encodeCursor(extra.timestamp.toISOString(), extra.id) : null,
      };
    }
  );
};
