import { Module } from '@nestjs/common';

import { KeysController } from './keys.controller';
import { UsageController } from './usage.controller';

@Module({
  controllers: [KeysController, UsageController],
})
export class KeysModule {}
