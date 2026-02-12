import { Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { OrdersService } from './orders.service';

type AuthedRequest = Request & { user?: AuthUser };

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  async list(@Req() req: AuthedRequest) {
    const orders = await this.orders.listMyOrders(req.user!.id);
    return { items: orders };
  }

  @Get(':orderId')
  async detail(@Req() req: AuthedRequest, @Param('orderId') orderId: string) {
    const order = await this.orders.getMyOrder(req.user!.id, orderId);
    return { order };
  }

  @Post(':orderId/cancel')
  @HttpCode(200)
  async cancel(@Req() req: AuthedRequest, @Param('orderId') orderId: string) {
    const order = await this.orders.cancelUnpaidOrder(req.user!.id, orderId);
    return { order };
  }

  @Post('suborders/:subOrderId/confirm-receipt')
  @HttpCode(200)
  async confirmReceipt(@Req() req: AuthedRequest, @Param('subOrderId') subOrderId: string) {
    const order = await this.orders.confirmReceipt(req.user!.id, subOrderId);
    return { order };
  }
}
