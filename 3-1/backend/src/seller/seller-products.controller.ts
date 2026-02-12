import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthUser } from '../auth/types';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { SellerProductsService } from './seller-products.service';
import { ErrorCodes } from '../shared/http/error-codes';

type AuthedRequest = Request & { user?: AuthUser };

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().min(0),
  stock: z.number().int().min(0),
  categoryId: z.string().min(1),
});

const patchSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    price: z.number().int().min(0).optional(),
    stock: z.number().int().min(0).optional(),
    categoryId: z.string().min(1).optional(),
    status: z.enum(['draft', 'active', 'inactive', 'banned']).optional(),
  })
  .strict();

@Controller('seller/products')
@UseGuards(AuthGuard, RolesGuard)
@Roles('seller')
export class SellerProductsController {
  constructor(private readonly products: SellerProductsService) {}

  @Get()
  async list(@Req() req: AuthedRequest) {
    const items = await this.products.listMyProducts(req.user!.id);
    return { items };
  }

  @Get(':productId')
  async detail(@Req() req: AuthedRequest, @Param('productId') productId: string) {
    const product = await this.products.getMyProduct(req.user!.id, productId);
    if (!product) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Product not found' });
    return { product };
  }

  @Post()
  async create(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    const product = await this.products.createProduct(req.user!.id, body);
    return { product };
  }

  @Patch(':productId')
  async patch(
    @Req() req: AuthedRequest,
    @Param('productId') productId: string,
    @Body(new ZodValidationPipe(patchSchema)) body: z.infer<typeof patchSchema>,
  ) {
    const product = await this.products.updateMyProduct(req.user!.id, productId, body);
    return { product };
  }
}
