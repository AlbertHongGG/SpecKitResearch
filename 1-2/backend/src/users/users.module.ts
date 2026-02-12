import { Module } from '@nestjs/common';
import { ManagerScopeService } from './permissions/manager-scope.service';

@Module({
    providers: [ManagerScopeService],
    exports: [ManagerScopeService],
})
export class UsersModule { }
