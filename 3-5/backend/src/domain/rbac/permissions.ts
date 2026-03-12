export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

export const roleRank: Record<ProjectRole, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4,
};

export function hasAtLeastRole(actual: ProjectRole, required: ProjectRole): boolean {
    return roleRank[actual] >= roleRank[required];
}

export function canManageProject(role: ProjectRole): boolean {
    return role === 'owner';
}

export function canInviteMembers(role: ProjectRole): boolean {
    return role === 'owner' || role === 'admin';
}

export function canWriteBoard(role: ProjectRole): boolean {
    return role === 'owner' || role === 'admin' || role === 'member';
}

export function canComment(role: ProjectRole): boolean {
    return role !== 'viewer';
}
