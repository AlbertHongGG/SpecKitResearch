import { Module } from '@nestjs/common';
import { PrismaService } from './db/prisma.service';

@Module({
	providers: [PrismaService],
	exports: [PrismaService],
})
export class SharedModule {}
