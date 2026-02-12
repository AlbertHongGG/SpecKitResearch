import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { SellerProductsService } from '../seller/seller-products.service';

const patchSchema = z.object({
  status: z.enum(['draft', 'active', 'inactive', 'banned']).optional(),
});

@Controller('admin/products')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminProductsController {
  constructor(private readonly products: SellerProductsService) {}

  @Patch(':productId')
  async patch(
    @Param('productId') productId: string,
    @Body(new ZodValidationPipe(patchSchema)) body: z.infer<typeof patchSchema>,
  ) {
    const product = await this.products.adminUpdateProduct(productId, body);
    return { product };
  }
}
