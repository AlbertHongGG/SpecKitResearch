import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { AuthGuard } from '../../guards/auth.guard';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';
import { GraceExpirationJob } from './grace-expiration.job';

const runSchema = z
  .object({
    now: z.string().datetime().optional(),
  })
  .strict();

@Controller('internal/jobs')
@UseGuards(AuthGuard, PlatformAdminGuard)
export class JobsDevController {
  constructor(private readonly grace: GraceExpirationJob) {}

  @Post('grace-expiration/run')
  async runGraceExpiration(@Body() body: unknown) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Not found' });
    }

    const parsed = runSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const now = parsed.data.now ? new Date(parsed.data.now) : new Date();
    await this.grace.runOnce(now);

    return { ok: true, now: now.toISOString() };
  }
}
