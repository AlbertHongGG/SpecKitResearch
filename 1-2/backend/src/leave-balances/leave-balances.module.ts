import { Module } from '@nestjs/common';
import { LeaveBalancesController } from './leave-balances.controller';

@Module({
    controllers: [LeaveBalancesController],
})
export class LeaveBalancesModule { }
