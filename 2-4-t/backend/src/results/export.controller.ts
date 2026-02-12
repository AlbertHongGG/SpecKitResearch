import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../auth/require-auth.guard';
import { RequireOwnerGuard } from '../auth/require-owner.guard';
import { ExportService } from './export.service';

@Controller('surveys/:id/export')
export class ExportController {
  constructor(private readonly exporter: ExportService) {}

  @Get()
  @UseGuards(RequireAuthGuard, RequireOwnerGuard)
  async export(@Req() req: Request, @Param('id') surveyId: string, @Query('format') format?: string) {
    const user = (req as any).user as { id: string };
    const f = format === 'csv' ? 'csv' : 'json';
    const rows = await this.exporter.exportResponsesForOwner(user.id, surveyId, f);
    return { export: { format: f, rows } };
  }
}
