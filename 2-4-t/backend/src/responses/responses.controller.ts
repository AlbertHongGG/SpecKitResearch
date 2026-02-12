import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SubmissionRequestSchema } from '@app/contracts';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import { AntiAbuseService } from './anti-abuse.service';
import { ResponsesService } from './responses.service';

@Controller()
export class ResponsesController {
  constructor(
    private readonly antiAbuse: AntiAbuseService,
    private readonly responses: ResponsesService
  ) {}

  @Post('/s/:slug/responses')
  async submit(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(SubmissionRequestSchema)) body: any,
    @Req() req: Request
  ) {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    this.antiAbuse.checkOrThrow(`submit:${slug}:${ip}`);

    const requesterUserId = ((req as any).user?.id ?? null) as string | null;

    const response = await this.responses.submit({
      slug,
      requesterUserId,
      answers: body.answers
    });

    return { response };
  }
}
