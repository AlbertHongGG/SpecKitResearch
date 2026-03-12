'use client';

import { zRealtimeServerMessage, type RealtimeClientMessage, type RealtimeServerMessage } from '@trello-lite/shared';
import { loadWebConfig } from '../../config';

type WsClientState = 'idle' | 'connecting' | 'open' | 'closed';

export type WsClientOptions = {
  projectId: string;
  getLastSeenSeq: () => number | null;
  clientId?: string;
  onMessage: (msg: RealtimeServerMessage) => void;
  onStatus?: (status: WsClientState) => void;
  onError?: (err: unknown) => void;
};

function randomId(prefix: string) {
  try {
    return `${prefix}${crypto.randomUUID()}`;
  } catch {
    return `${prefix}${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  }
}

function getWsBaseUrl(): string {
  const cfg = loadWebConfig();
  const http = cfg.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '');
  if (http.startsWith('https://')) return http.replace(/^https:\/\//, 'wss://');
  if (http.startsWith('http://')) return http.replace(/^http:\/\//, 'ws://');
  return http;
}

function jitter(ms: number) {
  const spread = Math.min(250, Math.floor(ms * 0.2));
  const delta = Math.floor(Math.random() * (spread * 2 + 1)) - spread;
  return ms + delta;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private state: WsClientState = 'idle';
  private stopped = false;
  private attempt = 0;
  private reconnectTimer: number | null = null;

  constructor(private readonly options: WsClientOptions) {}

  start() {
    if (this.stopped) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.connect();
  }

  send(message: RealtimeClientMessage) {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(message));
    } catch (err) {
      this.options.onError?.(err);
    }
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.ws?.close(1000, 'Client stopped');
    } catch {
      // ignore
    }
    this.ws = null;
    this.setState('closed');
  }

  reconnectNow() {
    if (this.stopped) return;
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    this.attempt = 0;
    try {
      ws?.close(1012, 'Reconnect');
    } catch {
      // ignore
    }
    this.connect();
  }

  private setState(s: WsClientState) {
    this.state = s;
    this.options.onStatus?.(s);
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    const base = Math.min(10_000, 250 * 2 ** Math.min(this.attempt, 6));
    const delay = jitter(base);

    if (this.reconnectTimer != null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private connect() {
    if (this.stopped) return;

    const base = getWsBaseUrl();
    const url = `${base}/realtime?projectId=${encodeURIComponent(this.options.projectId)}`;

    this.setState('connecting');
    this.attempt += 1;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.setState('open');

      const lastSeenSeq = this.options.getLastSeenSeq();

      const hello: RealtimeClientMessage = {
        type: 'hello',
        projectId: this.options.projectId,
        lastSeenSeq,
        clientId: this.options.clientId ?? randomId('web_'),
        capabilities: { supportsSnapshot: true },
      };

      this.send(hello);
    };

    ws.onmessage = (evt) => {
      try {
        const raw = typeof evt.data === 'string' ? evt.data : (evt.data as any)?.toString?.() ?? '';
        const json = JSON.parse(raw);
        const parsed = zRealtimeServerMessage.safeParse(json);
        if (!parsed.success) {
          // Unknown or invalid message. Ignore but notify for fallback.
          this.options.onError?.(parsed.error);
          return;
        }
        this.options.onMessage(parsed.data);
      } catch (err) {
        this.options.onError?.(err);
      }
    };

    ws.onerror = (evt) => {
      this.options.onError?.(evt);
    };

    ws.onclose = () => {
      this.setState('closed');
      this.ws = null;
      this.scheduleReconnect();
    };
  }
}
