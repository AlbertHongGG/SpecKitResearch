import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  zRealtimeClientMessage,
  zRealtimeKnownServerMessage,
  zRealtimeEnvelopeBase,
  zRealtimeSnapshotPayload,
} from './realtime';

function uuid() {
  return randomUUID();
}

describe('realtime schema', () => {
  it('parses hello client message', () => {
    const msg = {
      type: 'hello',
      projectId: uuid(),
      lastSeenSeq: null,
      clientId: 'c_1',
      capabilities: { supportsSnapshot: true },
    };

    expect(zRealtimeClientMessage.parse(msg)).toEqual(msg);
  });

  it('parses snapshot server message', () => {
    const projectId = uuid();
    const now = new Date().toISOString();

    const payload = zRealtimeSnapshotPayload.parse({
      project: {
        id: projectId,
        name: 'Demo',
        description: null,
        ownerId: uuid(),
        visibility: 'private',
        status: 'active',
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      boards: [],
      lists: [],
      tasks: [],
      memberships: [],
    });

    const msg = {
      type: 'snapshot',
      projectId,
      eventId: uuid(),
      seq: 1,
      ts: now,
      payload,
    };

    expect(zRealtimeKnownServerMessage.parse(msg)).toEqual(msg);
  });

  it('accepts unknown server event types via base envelope', () => {
    const msg = {
      type: 'something.future',
      projectId: uuid(),
      eventId: uuid(),
      seq: 10,
      ts: new Date().toISOString(),
      payload: { any: 'thing' },
    };

    expect(zRealtimeEnvelopeBase.parse(msg)).toEqual(msg);
  });
});
