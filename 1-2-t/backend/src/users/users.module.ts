import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from './users.service';

@Module({
  providers: [PrismaService, UsersService],
  exports: [UsersService, PrismaService],
})
export class UsersModule {}
