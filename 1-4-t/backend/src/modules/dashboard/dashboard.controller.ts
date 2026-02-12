import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe'
import { dashboardQuerySchema } from './dashboard.dto'
import { DashboardService } from './dashboard.service'

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @Roles('Admin')
  async metrics(@Query(new ZodValidationPipe(dashboardQuerySchema)) query: any) {
    return this.dashboard.metrics({ range: query.range })
  }
}
