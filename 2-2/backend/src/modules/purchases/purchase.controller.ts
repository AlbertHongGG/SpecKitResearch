import { Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PurchaseService } from './purchase.service.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('courses')
@Roles('student', 'instructor')
export class PurchaseController {
  constructor(private readonly purchases: PurchaseService) {}

  @Post(':courseId/purchase')
  async purchase(@Param('courseId') courseId: string, @Req() req: Request) {
    return this.purchases.purchaseCourse(req.user!.id, courseId, req.user!.role);
  }
}
