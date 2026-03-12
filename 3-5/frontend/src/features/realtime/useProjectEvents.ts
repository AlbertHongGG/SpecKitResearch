'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { applyProjectEvent, type ProjectEvent } from './applyEvents';
import { createProjectEventSource, resyncSnapshotAfterReconnect } from './reconnect';

const EVENT_TYPES = [
    'TaskCreated',
    'TaskUpdated',
    'TaskStatusUpdated',
    'TaskMoved',
    'TaskArchived',
    'ListWipUpdated',
    'ListReordered',
    'BoardReordered',
    'CommentAdded',
    'ActivityAppended',
    'ProjectArchived',
    'BoardArchived',
    'ListArchived',
] as const;

function safeJsonParse(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

export function useProjectEvents(params: {
    projectId: string;
    enabled: boolean;
    after?: string | null;
}) {
    const queryClient = useQueryClient();
    const lastEventIdRef = useRef<string | null>(params.after ?? null);

    useEffect(() => {
        if (!params.enabled) return;

        lastEventIdRef.current = params.after ?? lastEventIdRef.current;

        let stopped = false;
        let retry = 0;
        let handle: ReturnType<typeof createProjectEventSource> | null = null;

        const connect = (after: string | null) => {
            handle = createProjectEventSource({ projectId: params.projectId, after });
            const es = handle.es;

            const attach = (type: string) => {
                es.addEventListener(type, (e) => {
                    const ev = e as MessageEvent;
                    const id = ev.lastEventId || '';
                    if (id) lastEventIdRef.current = id;
                    const data = typeof ev.data === 'string' ? safeJsonParse(ev.data) : ev.data;

                    const event: ProjectEvent = { id, type, data };
                    applyProjectEvent(queryClient, params.projectId, event);
                });
            };

            for (const t of EVENT_TYPES) attach(t);

            es.onopen = async () => {
                if (retry > 0) {
                    await resyncSnapshotAfterReconnect(queryClient, params.projectId);
                }
                retry = 0;
            };

            es.onerror = async () => {
                handle?.close();
                if (stopped) return;

                const timeout = Math.min(10_000, 500 * Math.pow(2, retry));
                retry += 1;

                setTimeout(() => {
                    if (stopped) return;
                    connect(lastEventIdRef.current);
                }, timeout);
            };
        };

        connect(lastEventIdRef.current);

        return () => {
            stopped = true;
            handle?.close();
        };
    }, [params.enabled, params.projectId, params.after, queryClient]);
}
