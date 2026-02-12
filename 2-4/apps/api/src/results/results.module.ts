import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExportService } from './export.service';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ResultsController],
  providers: [ResultsService, ExportService],
})
export class ResultsModule {}
