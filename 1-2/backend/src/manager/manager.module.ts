import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';

@Module({
    imports: [UsersModule],
    controllers: [ManagerController],
    providers: [ManagerService],
})
export class ManagerModule { }
