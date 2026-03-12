import { z } from 'zod';

export const zUser = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  createdAt: z.string().datetime(),
});

export const zProject = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  ownerId: z.string().uuid(),
  visibility: z.enum(['private', 'shared']),
  status: z.enum(['active', 'archived']),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const zBoard = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  order: z.number().int(),
  status: z.enum(['active', 'archived']),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const zList = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  title: z.string(),
  order: z.number().int(),
  status: z.enum(['active', 'archived']),
  isWipLimited: z.boolean(),
  wipLimit: z.number().int().nullable(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const zTask = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  boardId: z.string().uuid(),
  listId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.union([z.string().date(), z.string().datetime()]).nullable(),
  priority: z.number().int().nullable(),
  position: z.string(),
  status: z.enum(['open', 'in_progress', 'blocked', 'done', 'archived']),
  version: z.number().int(),
  createdByUserId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  assignees: z
    .array(
      z.object({
        taskId: z.string().uuid(),
        userId: z.string().uuid(),
        assignedAt: z.string().datetime(),
      })
    )
    .optional(),
});

export const zComment = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string(),
  createdAt: z.string().datetime(),
});

export const zActivity = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  actorId: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.unknown().nullable().optional(),
});

export type User = z.infer<typeof zUser>;
export type Project = z.infer<typeof zProject>;
export type Board = z.infer<typeof zBoard>;
export type List = z.infer<typeof zList>;
export type Task = z.infer<typeof zTask>;
export type Comment = z.infer<typeof zComment>;
export type Activity = z.infer<typeof zActivity>;
