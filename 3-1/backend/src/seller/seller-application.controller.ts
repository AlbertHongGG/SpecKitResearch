import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { PrismaService } from '../shared/db/prisma.service';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';

type AuthedRequest = Request & { user?: AuthUser };

const applySchema = z.object({
  shopName: z.string().min(1),
  documents: z.any().optional(),
});

@Controller('seller')
@UseGuards(AuthGuard)
export class SellerApplicationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('application')
  async getMyApplication(@Req() req: AuthedRequest) {
    const app = await this.prisma.sellerApplication.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    return { application: app ? {
      id: app.id,
      userId: app.userId,
      shopName: app.shopName,
      status: app.status,
      createdAt: app.createdAt.toISOString(),
    } : null };
  }

  @Post('apply')
  async apply(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(applySchema)) body: z.infer<typeof applySchema>,
  ) {
    const existing = await this.prisma.sellerApplication.findFirst({
      where: { userId: req.user!.id, status: 'submitted' },
      orderBy: { createdAt: 'desc' },
    });
    const app =
      existing ??
      (await this.prisma.sellerApplication.create({
        data: {
          userId: req.user!.id,
          shopName: body.shopName,
          documents: body.documents ?? null,
          status: 'submitted',
        },
      }));

    return {
      application: {
        id: app.id,
        userId: app.userId,
        shopName: app.shopName,
        status: app.status,
        createdAt: app.createdAt.toISOString(),
      },
    };
  }
}
