import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('surveys/:slug')
  async loadSurvey(@Param('slug') slug: string) {
    const result = await this.publicService.loadPublishedSurveyBySlug(slug);
    if (!result) throw new NotFoundException('Not found');
    return result;
  }
}
