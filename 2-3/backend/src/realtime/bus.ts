import { ulid } from 'ulid';
import type { RealtimeEvent } from './events.js';
import { serializeSseEvent } from './events.js';

type Subscriber = {
    write: (chunk: string) => void;
    close: () => void;
};

type ProjectStream = {
    buffer: RealtimeEvent[];
    subscribers: Set<Subscriber>;
};

const MAX_BUFFER = 500;
const streams = new Map<string, ProjectStream>();

function getStream(projectId: string): ProjectStream {
    const existing = streams.get(projectId);
    if (existing) return existing;
    const created: ProjectStream = { buffer: [], subscribers: new Set() };
    streams.set(projectId, created);
    return created;
}

export function publishEvent(projectId: string, type: string, data: unknown): RealtimeEvent {
    const stream = getStream(projectId);
    const event: RealtimeEvent = { id: ulid(), type, data };

    stream.buffer.push(event);
    if (stream.buffer.length > MAX_BUFFER) {
        stream.buffer.splice(0, stream.buffer.length - MAX_BUFFER);
    }

    for (const sub of stream.subscribers) {
        sub.write(serializeSseEvent(event));
    }

    return event;
}

export function subscribe(projectId: string, subscriber: Subscriber): () => void {
    const stream = getStream(projectId);
    stream.subscribers.add(subscriber);
    return () => {
        stream.subscribers.delete(subscriber);
    };
}

export function backfill(projectId: string, afterId?: string): RealtimeEvent[] {
    const stream = getStream(projectId);
    if (!afterId) return [];
    return stream.buffer.filter((e) => e.id > afterId);
}

export function latestEventId(projectId: string): string {
    const stream = getStream(projectId);
    return stream.buffer.at(-1)?.id ?? '';
}
