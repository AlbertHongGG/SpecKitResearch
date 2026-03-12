export type RealtimeSocket = {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: 'close', listener: () => void): void;
  off?(event: 'close', listener: () => void): void;
};

type ProjectId = string;

export type Broadcaster = {
  subscribe(projectId: ProjectId, socket: RealtimeSocket): void;
  unsubscribe(projectId: ProjectId, socket: RealtimeSocket): void;
  broadcast(projectId: ProjectId, message: unknown): void;
  connectionCount(projectId: ProjectId): number;
};

const WS_OPEN = 1;

export function createBroadcaster(): Broadcaster {
  const channels = new Map<ProjectId, Set<RealtimeSocket>>();

  function subscribe(projectId: ProjectId, socket: RealtimeSocket) {
    let set = channels.get(projectId);
    if (!set) {
      set = new Set();
      channels.set(projectId, set);
    }
    set.add(socket);

    const onClose = () => {
      unsubscribe(projectId, socket);
    };

    socket.on('close', onClose);
  }

  function unsubscribe(projectId: ProjectId, socket: RealtimeSocket) {
    const set = channels.get(projectId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) channels.delete(projectId);
  }

  function broadcast(projectId: ProjectId, message: unknown) {
    const set = channels.get(projectId);
    if (!set || set.size === 0) return;

    const payload = JSON.stringify(message);

    for (const socket of [...set]) {
      try {
        if (socket.readyState !== WS_OPEN) {
          unsubscribe(projectId, socket);
          continue;
        }
        socket.send(payload);
      } catch {
        unsubscribe(projectId, socket);
        try {
          socket.close(1011, 'Send failed');
        } catch {
          // ignore
        }
      }
    }
  }

  function connectionCount(projectId: ProjectId) {
    return channels.get(projectId)?.size ?? 0;
  }

  return { subscribe, unsubscribe, broadcast, connectionCount };
}
