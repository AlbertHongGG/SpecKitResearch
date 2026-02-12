import { Module } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { PublicController } from './public.controller';

@Module({
  controllers: [PublicController],
  providers: [PrismaService]
})
export class PublicModule {}
