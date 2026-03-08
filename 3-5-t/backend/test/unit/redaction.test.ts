import { describe, expect, it, vi } from 'vitest';

import { createLogger } from '../../src/common/logging/logger';

describe('logger redaction', () => {
  it('does not log authorization/cookie fields', () => {
    const writes: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: any) => {
      writes.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk));
      return true;
    }) as any);

    const logger = createLogger({
      nodeEnv: 'production',
      port: 0,
      databaseUrl: 'file:dev.db',
      apiKeyPepper: 'test-pepper-0123456789',
      sessionCookieName: 'sid',
      sessionTtlDays: 30,
      passwordMinLength: 12,
      upstreamAllowlistHosts: ['localhost'],
      logLevel: 'info',
      usageQueueMax: 1,
      auditQueueMax: 1,
      logFlushIntervalMs: 100,
      rateLimitCleanupIntervalMs: 60_000,
      rateLimitCounterRetentionMinuteHours: 6,
      rateLimitCounterRetentionHourDays: 7,
    });

    logger.info({
      req: { headers: { authorization: 'Bearer SECRET', cookie: 'sid=SECRET' } },
      res: { headers: { 'set-cookie': ['sid=SECRET'] } },
    });

    spy.mockRestore();
    const output = writes.join('');
    expect(output).not.toContain('Bearer SECRET');
    expect(output).not.toContain('sid=SECRET');
  });
});
