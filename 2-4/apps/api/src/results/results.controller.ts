import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { ExportResponseSchema, ResultsResponseSchema } from '@acme/contracts';

import { OwnerGuard } from '../auth/owner.guard';
import { logInfo } from '../common/logger';
import { incCounter } from '../common/metrics';
import { ExportService } from './export.service';
import { ResultsService } from './results.service';

@Controller('surveys')
@UseGuards(OwnerGuard)
export class ResultsController {
  constructor(
    private readonly results: ResultsService,
    private readonly exportService: ExportService,
  ) {}

  @Get(':surveyId/results')
  async getResults(@Param('surveyId') surveyId: string) {
    incCounter('results_request');
    const body = await this.results.getResults(surveyId);
    ResultsResponseSchema.parse(body);
    logInfo('results_success', { surveyId, response_count: body.totals.response_count });
    return body;
  }

  @Get(':surveyId/export')
  async export(
    @Param('surveyId') surveyId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    incCounter('export_request');
    const body = await this.exportService.exportResponses({
      surveyId,
      cursor: cursor || undefined,
      limit: limit ? Number(limit) : undefined,
    });
    ExportResponseSchema.parse(body);
    logInfo('export_success', {
      surveyId,
      item_count: body.responses.length,
      next_cursor: body.next_cursor ? true : false,
    });
    return body;
  }
}
