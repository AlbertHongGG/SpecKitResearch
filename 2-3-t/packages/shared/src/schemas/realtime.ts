import { z } from 'zod';
import { zBoard, zList, zProject, zTask, zComment, zActivity } from './entities';

const zProjectId = z.string().uuid();
const zEventId = z.string().uuid();

export const zRealtimeHello = z.object({
  type: z.literal('hello'),
  projectId: zProjectId,
  lastSeenSeq: z.number().int().nullable(),
  clientId: z.string().min(1),
  capabilities: z
    .object({
      supportsSnapshot: z.boolean(),
    })
    .optional(),
});

export const zRealtimeAck = z.object({
  type: z.literal('ack'),
  projectId: zProjectId,
  seq: z.number().int().nonnegative(),
});

export const zRealtimeClientMessage = z.discriminatedUnion('type', [zRealtimeHello, zRealtimeAck]);
export type RealtimeClientMessage = z.infer<typeof zRealtimeClientMessage>;

export const zRealtimeEnvelopeBase = z.object({
  type: z.string().min(1),
  projectId: zProjectId,
  eventId: zEventId,
  seq: z.number().int().nonnegative(),
  ts: z.string().datetime(),
  payload: z.unknown(),
});

export const zProjectMembership = z.object({
  id: z.string().uuid(),
  projectId: zProjectId,
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  version: z.number().int(),
  joinedAt: z.string().datetime(),
});

export const zRealtimeSnapshotPayload = z.object({
  project: zProject,
  boards: z.array(zBoard),
  lists: z.array(zList),
  tasks: z.array(zTask),
  memberships: z.array(zProjectMembership),
});

export const zRealtimeSnapshotMessage = zRealtimeEnvelopeBase.extend({
  type: z.literal('snapshot'),
  payload: zRealtimeSnapshotPayload,
});

export const zRealtimeErrorMessage = zRealtimeEnvelopeBase.extend({
  type: z.literal('error'),
  payload: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
});

export const zRealtimeTaskMovedMessage = zRealtimeEnvelopeBase.extend({
  type: z.literal('task.moved'),
  payload: z.object({
    taskId: z.string().uuid(),
    fromListId: z.string().uuid(),
    toListId: z.string().uuid(),
    position: z.string().min(1),
    version: z.number().int(),
  }),
});

export const zRealtimeTaskUpdatedMessage = zRealtimeEnvelopeBase.extend({
  type: z.literal('task.updated'),
  payload: z.object({
    task: zTask,
  }),
});

export const zRealtimeTaskCreatedMessage = zRealtimeEnvelopeBase.extend({
  type: z.literal('task.created'),
  payload: z.object({
    task: zTask,
  }),
});

export const zRealtimeTaskArchivedMessage = zRealtimeEnvelopeBase.extend({
  type: z.literal('task.archived'),
  payload: z.object({
    taskId: z.string().uuid(),
    version: z.number().int(),
  }),
});

export const zRealtimeCommentCreatedMessage = zRealtimeEnvelopeBase.extend({
  type: z.literal('comment.created'),
  payload: zComment,
});

export const zRealtimeActivityAppendedMessage = zRealtimeEnvelopeBase.extend({
  type: z.literal('activity.appended'),
  payload: zActivity,
});

export const zRealtimeKnownServerMessage = z.discriminatedUnion('type', [
  zRealtimeSnapshotMessage,
  zRealtimeErrorMessage,
  zRealtimeTaskMovedMessage,
  zRealtimeTaskUpdatedMessage,
  zRealtimeTaskCreatedMessage,
  zRealtimeTaskArchivedMessage,
  zRealtimeCommentCreatedMessage,
  zRealtimeActivityAppendedMessage,
]);

export const zRealtimeServerMessage = zRealtimeEnvelopeBase.or(zRealtimeKnownServerMessage);
export type RealtimeServerMessage = z.infer<typeof zRealtimeServerMessage>;
export type RealtimeKnownServerMessage = z.infer<typeof zRealtimeKnownServerMessage>;
