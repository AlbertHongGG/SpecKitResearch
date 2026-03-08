import { Controller, Get, Req } from '@nestjs/common';
import { EntitlementDecisionService } from './entitlement-decision.service';

@Controller('entitlements')
export class EntitlementsController {
  constructor(private readonly service: EntitlementDecisionService) {}

  @Get()
  get(@Req() req: any) {
    return this.service.resolve(req.orgId);
  }
}
