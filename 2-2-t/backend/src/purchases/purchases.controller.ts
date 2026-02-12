import { Controller, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../common/auth/session.guard';
import { PurchasesService } from './purchases.service';

@Controller('courses')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Post(':courseId/purchase')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  async purchase(@Param('courseId') courseId: string, @Req() req: any) {
    return this.service.purchaseCourse({ courseId, userId: req.user.id });
  }
}
