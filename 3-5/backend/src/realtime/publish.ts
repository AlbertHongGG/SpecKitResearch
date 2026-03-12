import { publishEvent } from './bus.js';

export function publish(projectId: string, type: string, data: unknown): { eventId: string } {
    const event = publishEvent(projectId, type, data);
    return { eventId: event.id };
}
