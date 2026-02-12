import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../auth/require-auth.guard';
import { RequireOwnerGuard } from '../auth/require-owner.guard';
import { AggregatesService } from './aggregates.service';

@Controller('surveys/:id/results')
export class ResultsController {
  constructor(private readonly aggregates: AggregatesService) {}

  @Get()
  @UseGuards(RequireAuthGuard, RequireOwnerGuard)
  async getResults(@Req() req: Request, @Param('id') surveyId: string) {
    const user = (req as any).user as { id: string };
    return this.aggregates.getResultsForOwner(user.id, surveyId);
  }
}
