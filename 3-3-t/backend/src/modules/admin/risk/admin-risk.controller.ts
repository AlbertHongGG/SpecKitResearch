import { Controller, Get } from '@nestjs/common';
import { AdminRiskService } from './admin-risk.service';

@Controller('admin/risk')
export class AdminRiskController {
  constructor(private readonly service: AdminRiskService) {}

  @Get()
  list() {
    return this.service.listRiskAccounts();
  }
}
