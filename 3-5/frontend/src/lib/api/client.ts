import { apiFetch } from './http';

export type User = {
    id: string;
    email: string;
    displayName: string;
    createdAt?: string;
};

export type AuthUserResponse = {
    user: User;
    session: { expiresAt: string };
};

export type Project = {
    id: string;
    version: number;
    name: string;
    description?: string | null;
    ownerId: string;
    visibility: 'private' | 'shared';
    status: 'active' | 'archived';
    createdAt?: string;
    updatedAt?: string;
};

export type Board = {
    id: string;
    projectId: string;
    version: number;
    name: string;
    order: number;
    status: 'active' | 'archived';
    createdAt?: string;
    updatedAt?: string;
};

export type List = {
    id: string;
    boardId: string;
    version: number;
    title: string;
    order: number;
    status: 'active' | 'archived';
    isWipLimited: boolean;
    wipLimit?: number | null;
    createdAt?: string;
    updatedAt?: string;
};

export type Task = {
    id: string;
    projectId: string;
    boardId: string;
    listId: string;
    title: string;
    description?: string | null;
    dueDate?: string | null; // YYYY-MM-DD
    priority?: number | null;
    position: string;
    status: 'open' | 'in_progress' | 'blocked' | 'done' | 'archived';
    version: number;
    createdByUserId: string;
    createdAt?: string;
    updatedAt?: string;
    assigneeIds: string[];
};

export type ProjectMembership = {
    projectId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt?: string;
};

export type SnapshotResponse = {
    snapshotGeneratedAt: string;
    latestEventId: string | null;
    project: Project;
    boards: Board[];
    lists: List[];
    tasks: Task[];
    memberships: ProjectMembership[];
};

export type Invitation = {
    id: string;
    projectId: string;
    email: string;
    invitedRole: 'admin' | 'member' | 'viewer';
    status: 'pending' | 'accepted' | 'rejected' | 'revoked';
    createdAt: string;
    respondedAt?: string | null;
};

export type Comment = {
    id: string;
    taskId: string;
    authorId: string;
    content: string;
    createdAt: string;
};

export type ActivityEvent = {
    id: string;
    projectId: string;
    actorId: string;
    entityType: string;
    entityId: string;
    action: string;
    timestamp: string;
    metadata: Record<string, unknown>;
};

export type Membership = {
    projectId: string;
    userId: string;
    version: number;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: string;
};

export const api = {
    register: (body: { email: string; password: string; displayName?: string }) =>
        apiFetch<AuthUserResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

    login: (body: { email: string; password: string }) =>
        apiFetch<AuthUserResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

    refresh: () => apiFetch<AuthUserResponse>('/auth/refresh', { method: 'POST' }),

    logout: () => apiFetch<{ success: boolean }>('/auth/logout', { method: 'POST' }),

    me: () => apiFetch<User>('/auth/me'),

    myProjects: () =>
        apiFetch<{ projects: { project: Project; role: 'owner' | 'admin' | 'member' | 'viewer' }[]; invitations: Invitation[] }>(
            '/projects',
        ),

    createProject: (body: { name: string; description?: string; visibility?: 'private' | 'shared' }) =>
        apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(body) }),

    updateProject: (
        projectId: string,
        body: { expectedVersion: number; name?: string; description?: string; visibility?: 'private' | 'shared' },
    ) => apiFetch<Project>(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(body) }),

    snapshot: (projectId: string) => apiFetch<SnapshotResponse>(`/projects/${projectId}/snapshot`),

    activity: (projectId: string, params?: { cursor?: string; limit?: number }) => {
        const sp = new URLSearchParams();
        if (params?.cursor) sp.set('cursor', params.cursor);
        if (typeof params?.limit === 'number') sp.set('limit', String(params.limit));
        const qs = sp.toString();
        return apiFetch<{ events: ActivityEvent[]; nextCursor: string | null }>(
            `/projects/${projectId}/activity${qs ? `?${qs}` : ''}`,
        );
    },

    archiveProject: (projectId: string) => apiFetch<Project>(`/projects/${projectId}/archive`, { method: 'POST' }),

    createBoard: (projectId: string, body: { name: string }) =>
        apiFetch<Board>(`/projects/${projectId}/boards`, { method: 'POST', body: JSON.stringify(body) }),

    archiveBoard: (boardId: string) => apiFetch<Board>(`/boards/${boardId}/archive`, { method: 'POST' }),

    createList: (boardId: string, body: { title: string }) =>
        apiFetch<List>(`/boards/${boardId}/lists`, { method: 'POST', body: JSON.stringify(body) }),

    archiveList: (listId: string) => apiFetch<List>(`/lists/${listId}/archive`, { method: 'POST' }),

    reorderBoards: (projectId: string, body: { orderedBoardIds: string[] }) =>
        apiFetch<{ boards: Board[] }>(`/projects/${projectId}/boards/reorder`, {
            method: 'POST',
            body: JSON.stringify(body),
        }),

    reorderLists: (boardId: string, body: { orderedListIds: string[] }) =>
        apiFetch<{ lists: List[] }>(`/boards/${boardId}/lists/reorder`, {
            method: 'POST',
            body: JSON.stringify(body),
        }),

    updateListWip: (listId: string, body: { isWipLimited: boolean; wipLimit?: number }) =>
        apiFetch<List>(`/lists/${listId}/wip`, { method: 'PATCH', body: JSON.stringify(body) }),

    listTasks: (listId: string) => apiFetch<{ tasks: Task[] }>(`/lists/${listId}/tasks`),

    createTask: (
        listId: string,
        body: {
            title: string;
            description?: string;
            dueDate?: string;
            priority?: number;
            assigneeIds?: string[];
            idempotencyKey?: string;
        },
    ) => apiFetch<Task>(`/lists/${listId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),

    getTask: (taskId: string) => apiFetch<Task>(`/tasks/${taskId}`),

    updateTask: (
        taskId: string,
        body: {
            expectedVersion: number;
            title?: string;
            description?: string;
            dueDate?: string;
            priority?: number;
            assigneeIds?: string[];
        },
    ) => apiFetch<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),

    updateTaskStatus: (taskId: string, body: { expectedVersion: number; status: Task['status'] }) =>
        apiFetch<Task>(`/tasks/${taskId}/status`, { method: 'POST', body: JSON.stringify(body) }),

    moveTask: (
        taskId: string,
        body: {
            expectedVersion: number;
            toListId: string;
            beforeTaskId?: string | null;
            afterTaskId?: string | null;
            wipOverrideReason?: string | null;
        },
    ) =>
        apiFetch<{ task: Task; authoritativeOrder: { listId: string; tasks: { taskId: string; position: string }[] } }>(
            `/tasks/${taskId}/move`,
            {
                method: 'POST',
                body: JSON.stringify(body),
            },
        ),

    archiveTask: (taskId: string, body: { expectedVersion: number }) =>
        apiFetch<Task>(`/tasks/${taskId}/archive`, { method: 'POST', body: JSON.stringify(body) }),

    taskComments: (taskId: string) => apiFetch<{ comments: Comment[] }>(`/tasks/${taskId}/comments`),

    addComment: (taskId: string, body: { content: string }) =>
        apiFetch<Comment>(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify(body) }),

    projectInvitations: (projectId: string) => apiFetch<{ invitations: Invitation[] }>(`/projects/${projectId}/invitations`),

    createInvitation: (projectId: string, body: { email: string; invitedRole: 'admin' | 'member' | 'viewer' }) =>
        apiFetch<Invitation>(`/projects/${projectId}/invitations`, { method: 'POST', body: JSON.stringify(body) }),

    acceptInvitation: (invitationId: string) =>
        apiFetch<Invitation>(`/invitations/${invitationId}/accept`, { method: 'POST' }),

    rejectInvitation: (invitationId: string) =>
        apiFetch<Invitation>(`/invitations/${invitationId}/reject`, { method: 'POST' }),

    projectMembers: (projectId: string) => apiFetch<{ members: Membership[] }>(`/projects/${projectId}/members`),

    updateMemberRole: (projectId: string, body: { userId: string; role: Membership['role'] }) =>
        apiFetch<Membership>(`/projects/${projectId}/members`, { method: 'PATCH', body: JSON.stringify(body) }),

    removeMember: (projectId: string, userId: string) =>
        apiFetch<{ success: boolean }>(`/projects/${projectId}/members?userId=${encodeURIComponent(userId)}`, {
            method: 'DELETE',
        }),
};
