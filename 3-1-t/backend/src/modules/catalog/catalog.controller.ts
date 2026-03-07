import { Controller, Get, Param, Query, UsePipes } from '@nestjs/common';

import { ZodValidationPipe } from '../../common/validation/zod.pipe';
import { CatalogService } from './catalog.service';
import {
  type ProductListQuery,
  productIdParamSchema,
  productListQuerySchema,
} from './catalog.schemas';

@Controller('products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(productListQuerySchema))
  async list(@Query() query: ProductListQuery) {
    return this.catalogService.listProducts(query);
  }

  @Get(':id')
  async detail(@Param() rawParams: unknown) {
    const { id } = productIdParamSchema.parse(rawParams);
    return this.catalogService.getProductDetail(id);
  }
}
