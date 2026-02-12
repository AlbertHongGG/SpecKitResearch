import { Controller, Get } from '@nestjs/common'
import { TimeService } from '../time/time.service'

@Controller('health')
export class HealthController {
  constructor(private readonly time: TimeService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      time: this.time.now().toISOString(),
    }
  }
}
