'use client';

import type { Project, ProjectMembership } from '../api/client';

export function getReadonlyReason(params: {
    project: Project;
    myRole: ProjectMembership['role'] | null;
}): string | null {
    if (params.project.status === 'archived') return '專案已封存（唯讀）';
    if (!params.myRole) return '你不是專案成員';
    if (params.myRole === 'viewer') return 'Viewer 權限（唯讀）';
    return null;
}
