export type RealtimeEvent<T extends string = string, D = unknown> = {
    id: string;
    type: T;
    data: D;
};

export function serializeSseEvent(event: RealtimeEvent): string {
    // SSE format: id + event + data
    return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export function heartbeat(): string {
    return `: heartbeat\n\n`;
}
