import { Global, Module } from '@nestjs/common';

import { UsageWriter } from './usage.writer';
import { AuditWriter } from './audit.writer';

@Global()
@Module({
  providers: [UsageWriter, AuditWriter],
  exports: [UsageWriter, AuditWriter],
})
export class LogsModule {}
