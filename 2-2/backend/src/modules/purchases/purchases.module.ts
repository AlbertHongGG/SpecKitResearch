import { Module } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';
import { PurchaseService } from './purchase.service.js';
import { PurchaseController } from './purchase.controller.js';

@Module({
  controllers: [PurchaseController],
  providers: [PrismaService, PurchaseService],
})
export class PurchasesModule {}
