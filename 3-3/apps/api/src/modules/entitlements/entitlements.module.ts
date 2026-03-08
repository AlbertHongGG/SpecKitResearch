import { Module } from '@nestjs/common';
import { EntitlementsCache } from './entitlements.cache';
import { EntitlementsService } from './entitlements.service';

@Module({
  providers: [EntitlementsCache, EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
