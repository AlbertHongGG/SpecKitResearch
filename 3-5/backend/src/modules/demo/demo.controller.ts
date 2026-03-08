import { Controller, Get } from '@nestjs/common';

@Controller('demo')
export class DemoController {
  @Get('ping')
  ping() {
    return { ok: true, service: 'demo' };
  }
}
