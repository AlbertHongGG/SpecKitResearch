import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { CartService } from './cart.service';
import type { Request } from 'express';

type AuthedRequest = Request & { user?: AuthUser };

const setSchema = z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) });

@Controller('cart')
@UseGuards(AuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  async get(@Req() req: AuthedRequest) {
    const items = await this.cart.getCart(req.user!.id);
    return { items };
  }

  @Post('items')
  async add(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(setSchema)) body: z.infer<typeof setSchema>) {
    await this.cart.setItem(req.user!.id, body.productId, body.quantity);
    return { ok: true };
  }

  @Patch('items/:productId')
  async update(
    @Req() req: AuthedRequest,
    @Param('productId') productId: string,
    @Body(new ZodValidationPipe(z.object({ quantity: z.number().int().min(1) }))) body: { quantity: number },
  ) {
    await this.cart.setItem(req.user!.id, productId, body.quantity);
    return { ok: true };
  }

  @Delete('items/:productId')
  async remove(@Req() req: AuthedRequest, @Param('productId') productId: string) {
    await this.cart.removeItem(req.user!.id, productId);
    return { ok: true };
  }
}
