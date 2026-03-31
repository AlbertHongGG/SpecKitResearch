import { Module } from '@nestjs/common'

import { PrismaModule } from '../common/db/prisma.module'
import { PublicServicesController } from './public-services.controller'
import { ServicesService } from './services.service'

@Module({
  imports: [PrismaModule],
  controllers: [PublicServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
