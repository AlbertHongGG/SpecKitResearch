import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { SessionGuard } from '../common/auth/session.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MarkCompleteRequestSchema } from '@app/contracts';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly service: ProgressService) {}

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @UsePipes(new ZodValidationPipe(MarkCompleteRequestSchema))
  async complete(@Body() body: any, @Req() req: any) {
    return this.service.markComplete({
      userId: req.user.id,
      viewerRole: req.user.role,
      lessonId: body.lessonId,
    });
  }
}
