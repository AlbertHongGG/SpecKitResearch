import { IsEnum } from 'class-validator';
import { ActivityStatus } from '@prisma/client';

export class AdminChangeStatusDto {
  @IsEnum(ActivityStatus)
  toStatus!: ActivityStatus;
}
