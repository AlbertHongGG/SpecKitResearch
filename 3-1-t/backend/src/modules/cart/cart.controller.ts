import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UsePipes,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../auth/types';
import { ZodValidationPipe } from '../../common/validation/zod.pipe';
import {
  cartItemBodySchema,
  cartItemDeleteSchema,
  cartItemUpdateSchema,
  type CartItemBody,
  type CartItemDelete,
  type CartItemUpdate,
} from './cart.schemas';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser() user: CurrentUserType | undefined) {
    return this.cartService.getCart(user);
  }

  @Post('items')
  @UsePipes(new ZodValidationPipe(cartItemBodySchema))
  async addItem(
    @CurrentUser() user: CurrentUserType | undefined,
    @Body() body: CartItemBody,
  ) {
    return this.cartService.addItem(user, body);
  }

  @Patch('items')
  @UsePipes(new ZodValidationPipe(cartItemUpdateSchema))
  async updateItem(
    @CurrentUser() user: CurrentUserType | undefined,
    @Body() body: CartItemUpdate,
  ) {
    return this.cartService.updateItem(user, body);
  }

  @Delete('items')
  @UsePipes(new ZodValidationPipe(cartItemDeleteSchema))
  async removeItem(
    @CurrentUser() user: CurrentUserType | undefined,
    @Body() body: CartItemDelete,
  ) {
    return this.cartService.removeItem(user, body);
  }
}
