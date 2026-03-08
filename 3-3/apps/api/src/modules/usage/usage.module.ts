import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { UsageDevController } from './usage-dev.controller';
import { UsageService } from './usage.service';

@Module({
  controllers: [UsageController, UsageDevController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
