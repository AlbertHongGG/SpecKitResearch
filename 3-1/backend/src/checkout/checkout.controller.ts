import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { CheckoutService } from './checkout.service';

type AuthedRequest = Request & { user?: AuthUser };

const schema = z.object({
  paymentMethod: z.string().default('mock'),
  transactionId: z.string().min(8),
});

@Controller('checkout')
@UseGuards(AuthGuard)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post()
  async create(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(schema)) body: z.infer<typeof schema>) {
    return this.checkout.checkout(req.user!.id, body.paymentMethod, body.transactionId);
  }
}
