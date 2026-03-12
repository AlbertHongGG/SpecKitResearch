'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { zRealtimeKnownServerMessage, type RealtimeServerMessage } from '@trello-lite/shared';
import { useQueryClient } from '@tanstack/react-query';
import { applySnapshot } from './apply-snapshot';
import { applyRealtimeEvent } from './apply-event';
import { clearLastSeenSeq, getLastSeenSeq, setLastSeenSeq } from './seq-store';
import { WsClient } from './ws-client';
import { flushQueuedMutations } from '../offline/mutation-queue';

export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'closed';

export function useProjectRealtime(projectId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  const clientRef = useRef<WsClient | null>(null);

  const fallbackToRestSnapshot = useMemo(() => {
    return async () => {
      clearLastSeenSeq(projectId);
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
      // Force re-connect with lastSeenSeq=null.
      clientRef.current?.reconnectNow();
    };
  }, [projectId, queryClient]);

  useEffect(() => {
    if (!enabled) {
      clientRef.current?.stop();
      clientRef.current = null;
      setStatus('idle');
      return;
    }

    let lastSeq: number | null = getLastSeenSeq(projectId);

    const client = new WsClient({
      projectId,
      getLastSeenSeq: () => getLastSeenSeq(projectId),
      onStatus: setStatus,
      onError: async (err) => {
        const anyErr = err as any;
        const message = err instanceof Error ? err.message : String(err);
        setLastError(message);

        // Only treat contract/decode issues as a hard reset.
        if (anyErr?.name === 'ZodError') {
          await fallbackToRestSnapshot();
        }
      },
      onMessage: async (msg: RealtimeServerMessage) => {
        const seq = typeof msg.seq === 'number' ? msg.seq : null;
        if (seq != null && seq > 0) {
          // Detect gaps for non-snapshot messages.
          if (msg.type !== 'snapshot' && lastSeq != null && seq > lastSeq + 1) {
            setLastError(`RESUME_GAP: expected ${lastSeq + 1} but got ${seq}`);
            await fallbackToRestSnapshot();
            return;
          }

          lastSeq = seq;
          setLastSeenSeq(projectId, seq);
        }

        const known = zRealtimeKnownServerMessage.safeParse(msg);
        if (!known.success) {
          // Unknown message type: ignore.
          return;
        }

        const m = known.data;
        if (m.type === 'snapshot') {
          applySnapshot(queryClient, projectId, m.payload as any);
          lastSeq = m.seq;
          setLastSeenSeq(projectId, m.seq);
          // After catching up, try to flush offline work.
          const flushed = await flushQueuedMutations(projectId);
          if (flushed > 0) {
            await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
          }
          return;
        }

        if (m.type === 'error') {
          setLastError(`${m.payload.code}: ${m.payload.message}`);
          await fallbackToRestSnapshot();
          return;
        }

        applyRealtimeEvent(queryClient, projectId, m);
      },
    });

    clientRef.current = client;
    client.start();

    const onOnline = () => {
      void (async () => {
        const flushed = await flushQueuedMutations(projectId);
        if (flushed > 0) {
          await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
        }
      })();
    };

    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('online', onOnline);
      client.stop();
      clientRef.current = null;
    };
  }, [enabled, fallbackToRestSnapshot, projectId, queryClient]);

  // Opportunistic flush when enabled & already online.
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    void flushQueuedMutations(projectId);
  }, [enabled, projectId]);

  return { status, lastError };
}
