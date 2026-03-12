import type { FastifyRequest } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../httpErrors.js';
import type { ProjectRole } from '../../domain/rbac/permissions.js';
import { hasAtLeastRole } from '../../domain/rbac/permissions.js';
import { getProjectRoleOrThrow } from '../../domain/rbac/projectAccess.js';

declare module 'fastify' {
    interface FastifyRequest {
        projectAccess?: { projectId: string; role: ProjectRole };
    }
}

export function requireProjectRole(required: ProjectRole) {
    return async function projectRoleGuard(request: FastifyRequest): Promise<void> {
        const userId = request.user?.id;
        if (!userId) throw new UnauthorizedError();

        const projectId = (request.params as { projectId?: string }).projectId;
        if (!projectId) throw new ForbiddenError('Missing projectId');

        const role = await getProjectRoleOrThrow({ projectId, userId });
        if (!hasAtLeastRole(role, required)) throw new ForbiddenError('Insufficient role');

        request.projectAccess = { projectId, role };
    };
}
