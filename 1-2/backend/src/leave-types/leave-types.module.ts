import { Module } from '@nestjs/common';
import { LeaveTypesController } from './leave-types.controller';

@Module({
    controllers: [LeaveTypesController],
})
export class LeaveTypesModule { }
