import { env } from '../../lib/env';
import type { QueryClient } from '@tanstack/react-query';

export type EventSourceHandle = {
    es: EventSource;
    close: () => void;
};

export function createProjectEventSource(params: {
    projectId: string;
    after?: string | null;
}): EventSourceHandle {
    const url = new URL(`/projects/${params.projectId}/events`, env.NEXT_PUBLIC_API_BASE_URL);
    if (params.after) url.searchParams.set('after', params.after);

    const es = new EventSource(url.toString(), { withCredentials: true });

    return {
        es,
        close: () => es.close(),
    };
}

export async function resyncSnapshotAfterReconnect(queryClient: QueryClient, projectId: string) {
    await queryClient.invalidateQueries({ queryKey: ['snapshot', projectId] });
}
