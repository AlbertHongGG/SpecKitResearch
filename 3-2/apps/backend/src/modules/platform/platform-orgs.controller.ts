import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard.js';
import { PlatformOrgsService } from './platform-orgs.service.js';

const createSchema = z.object({
  name: z.string().min(1),
  plan: z.enum(['free', 'paid']),
});

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    plan: z.enum(['free', 'paid']).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  })
  .refine((x) => Object.keys(x).length > 0, { message: 'No fields to update' });

@Controller('platform/orgs')
@UseGuards(SessionGuard, PlatformAdminGuard)
export class PlatformOrgsController {
  constructor(private readonly orgs: PlatformOrgsService) {}

  @Get()
  async list(@Query('limit') limit: string | undefined, @Query('cursor') cursor: string | undefined) {
    return await this.orgs.listOrgs({ limit, cursor });
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const org = await this.orgs.createOrg({
      actor: { userId: user!.id, email: user!.email, platformRole: user!.platformRole },
      name: body.name,
      plan: body.plan,
    });
    return { orgId: org.id };
  }

  @Patch(':orgId')
  async patch(
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(patchSchema)) body: z.infer<typeof patchSchema>,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    await this.orgs.updateOrg({
      actor: { userId: user!.id, email: user!.email, platformRole: user!.platformRole },
      orgId,
      patch: body,
    });
    return { ok: true };
  }
}
