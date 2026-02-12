import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ResponsesController],
  providers: [ResponsesService],
})
export class ResponsesModule {}
