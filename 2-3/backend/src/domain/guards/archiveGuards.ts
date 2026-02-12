import { ConflictError } from '../../api/httpErrors.js';

export function assertNotArchived(entity: { status?: string } | null, message = 'Archived - read-only') {
    if (!entity) return;
    if (entity.status === 'archived') {
        throw new ConflictError({ message });
    }
}
