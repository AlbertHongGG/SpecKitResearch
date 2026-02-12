import { Module } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';
import { AntiAbuseService } from './anti-abuse.service';

@Module({
  controllers: [ResponsesController],
  providers: [PrismaService, ResponsesService, AntiAbuseService]
})
export class ResponsesModule {}
