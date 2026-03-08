import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgController } from './org.controller';
import { MembersController } from './members.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrgController, MembersController],
})
export class OrgModule {}
