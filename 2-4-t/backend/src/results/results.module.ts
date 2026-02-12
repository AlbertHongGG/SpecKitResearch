import { Module } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ResultsController } from './results.controller';
import { AggregatesService } from './aggregates.service';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { RequireAuthGuard } from '../auth/require-auth.guard';
import { RequireOwnerGuard } from '../auth/require-owner.guard';

@Module({
  controllers: [ResultsController, ExportController],
  providers: [PrismaService, AggregatesService, ExportService, RequireAuthGuard, RequireOwnerGuard]
})
export class ResultsModule {}

