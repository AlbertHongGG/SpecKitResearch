import type { AppConfig } from '../config';
import type { Broadcaster } from '../realtime/broadcaster';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    broadcaster: Broadcaster;
  }
}

export {};
