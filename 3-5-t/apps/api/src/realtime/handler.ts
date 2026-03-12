import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { zRealtimeAck, zRealtimeHello } from '@trello-lite/shared';
import { listProjectEventsSince } from '../repos/project-event-repo';
import { makeSnapshotMessage } from './snapshot';

type WsLike = {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: 'message', listener: (data: unknown) => void): void;
  on(event: 'close', listener: () => void): void;
  off?(event: 'message', listener: (data: unknown) => void): void;
  off?(event: 'close', listener: () => void): void;
  removeListener?(event: 'message', listener: (data: unknown) => void): void;
  removeListener?(event: 'close', listener: () => void): void;
};

type SocketStream = {
  socket?: WsLike;
} & WsLike;

const zQuery = z.object({
  projectId: z.string().uuid(),
});

function getSocket(conn: SocketStream): WsLike {
  return (conn.socket ?? conn) as WsLike;
}

function closePolicyViolation(conn: SocketStream, reason: string) {
  try {
    getSocket(conn).close(1008, reason);
  } catch {
    // ignore
  }
}

async function waitForFirstMessage(conn: SocketStream, timeoutMs = 5_000): Promise<string> {
  const socket = getSocket(conn);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('timeout'));
    }, timeoutMs);

    const onMessage = (raw: any) => {
      cleanup();
      resolve(typeof raw === 'string' ? raw : raw?.toString?.('utf8') ?? String(raw));
    };

    const onClose = () => {
      cleanup();
      reject(new Error('closed'));
    };

    function cleanup() {
      clearTimeout(timer);

      try {
        if (typeof socket.off === 'function') {
          socket.off('message', onMessage as any);
          socket.off('close', onClose);
        } else if (typeof socket.removeListener === 'function') {
          socket.removeListener('message', onMessage as any);
          socket.removeListener('close', onClose);
        }
      } catch {
        // ignore
      }
    }

    socket.on('message', onMessage as any);
    socket.on('close', onClose);
  });
}

export async function realtimeWsHandler(app: FastifyInstance, conn: SocketStream, req: FastifyRequest) {
  const socket = getSocket(conn);
  const origin = req.headers.origin;
  if (origin && origin !== app.config.WEB_ORIGIN) {
    closePolicyViolation(conn, 'Origin not allowed');
    return;
  }

  if (!req.user) {
    closePolicyViolation(conn, 'Unauthorized');
    return;
  }

  const query = zQuery.safeParse(req.query);
  if (!query.success) {
    closePolicyViolation(conn, 'Invalid projectId');
    return;
  }

  const projectId = query.data.projectId;

  // First message must be hello.
  let helloRaw: string;
  try {
    helloRaw = await waitForFirstMessage(conn);
  } catch {
    closePolicyViolation(conn, 'Missing hello');
    return;
  }

  let helloJson: unknown;
  try {
    helloJson = JSON.parse(helloRaw);
  } catch {
    closePolicyViolation(conn, 'Invalid JSON');
    return;
  }

  const parsedHello = zRealtimeHello.safeParse(helloJson);
  if (!parsedHello.success) {
    closePolicyViolation(conn, 'Invalid hello');
    return;
  }

  if (parsedHello.data.projectId !== projectId) {
    closePolicyViolation(conn, 'Project mismatch');
    return;
  }

  const membership = await app.prisma.projectMembership.findUnique({
    where: { projectId_userId: { projectId, userId: req.user.id } },
  });

  if (!membership) {
    closePolicyViolation(conn, 'Forbidden');
    return;
  }

  app.broadcaster.subscribe(projectId, socket as any);

  // Always start with a snapshot.
  const snapshot = await makeSnapshotMessage(app.prisma, projectId);
  if (!snapshot) {
    closePolicyViolation(conn, 'Not found');
    return;
  }

  socket.send(JSON.stringify(snapshot));

  // Optional resume: send events since lastSeenSeq.
  const sinceSeq = parsedHello.data.lastSeenSeq ?? null;
  if (sinceSeq !== null) {
    const events = await listProjectEventsSince(app.prisma, {
      projectId,
      sinceSeq,
      limit: 500,
    });

    for (const ev of events) {
      socket.send(
        JSON.stringify({
          type: ev.type,
          projectId: ev.projectId,
          eventId: ev.eventId,
          seq: ev.seq,
          ts: ev.ts.toISOString(),
          payload: ev.payload,
        })
      );
    }
  }

  // Optional client -> server messages (e.g. ack). For now we validate and ignore.
  socket.on('message', (raw: any) => {
    const text = typeof raw === 'string' ? raw : raw?.toString?.('utf8') ?? null;
    if (!text) return;

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return;
    }

    const ack = zRealtimeAck.safeParse(json);
    if (!ack.success) return;
    if (ack.data.projectId !== projectId) return;
  });
}
