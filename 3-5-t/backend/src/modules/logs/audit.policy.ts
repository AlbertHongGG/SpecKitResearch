import { ServiceUnavailableException } from '@nestjs/common';
import type { AuditWriter } from './audit.writer';
import type { AuditEvent } from './audit.events';

// Fail-closed helper for sensitive actions
export function enqueueAuditOrFailClosed(writer: AuditWriter, event: AuditEvent) {
  const ok = writer.enqueue(event);
  if (!ok) {
    throw new ServiceUnavailableException('Audit log degraded');
  }
}
