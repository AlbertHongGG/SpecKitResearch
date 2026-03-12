import type { TaskStatus } from '@prisma/client';
import { ValidationError } from '../../api/httpErrors.js';

export function assertTaskMutable(current: TaskStatus) {
    if (current === 'archived') {
        throw new ValidationError({ status: ['Archived tasks are read-only'] });
    }
}

export function assertStatusTransition(params: { from: TaskStatus; to: TaskStatus }) {
    if (params.from === params.to) return;

    if (params.from === 'archived') {
        throw new ValidationError({ status: ['Archived is terminal'] });
    }

    if (params.from === 'done' && params.to !== 'archived') {
        throw new ValidationError({ status: ['Done tasks can only be archived'] });
    }
}
