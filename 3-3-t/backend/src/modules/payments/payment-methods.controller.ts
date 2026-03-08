import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { PaymentMethodsRepository } from './payment-methods.repository';
import { AuditEventsService } from '../audit/audit-events.service';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(
    private readonly repository: PaymentMethodsRepository,
    private readonly auditEvents: AuditEventsService,
  ) {}

  @Get()
  list(@Req() req: any) {
    return this.repository.list(req.orgId);
  }

  @Post()
  async add(@Req() req: any, @Body() body: { provider: string; providerPaymentMethodRef: string; isDefault?: boolean }) {
    const item = await this.repository.add(req.orgId, body);
    await this.auditEvents.append(req, 'PAYMENT_METHOD_ADDED', 'PaymentMethod', item.id, {});
    return item;
  }

  @Patch(':id/default')
  async setDefault(@Req() req: any, @Param('id') id: string) {
    const item = await this.repository.setDefault(req.orgId, id);
    await this.auditEvents.append(req, 'PAYMENT_METHOD_SET_DEFAULT', 'PaymentMethod', id, {});
    return item;
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const item = await this.repository.remove(id);
    await this.auditEvents.append(req, 'PAYMENT_METHOD_REMOVED', 'PaymentMethod', id, {});
    return item;
  }
}
