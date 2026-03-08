import { Controller, Get, Req } from '@nestjs/common';
import { InvoicesRepository } from './invoices.repository';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesRepository: InvoicesRepository) {}

  @Get()
  async list(@Req() req: any) {
    return {
      items: await this.invoicesRepository.listByOrg(req.orgId),
    };
  }
}
