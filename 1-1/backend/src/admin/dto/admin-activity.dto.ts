import { IsDateString, IsIn, IsInt, IsString, Min, MinLength } from 'class-validator'
import type { ActivityStatus } from '@prisma/client'
import type { ActivityDetailDto } from '../../activities/dto/activity.dto'

export class ActivityUpsertRequestDto {
  @IsString()
  @MinLength(1)
  title!: string

  @IsString()
  description!: string

  @IsDateString()
  date!: string

  @IsString()
  location!: string

  @IsDateString()
  deadline!: string

  @IsInt()
  @Min(1)
  capacity!: number

  @IsString()
  @IsIn(['draft', 'published', 'full', 'closed', 'archived'])
  status!: ActivityStatus
}

export class ActivityStatusChangeRequestDto {
  @IsString()
  @IsIn(['draft', 'published', 'full', 'closed', 'archived'])
  new_status!: ActivityStatus
}

export type ActivityUpsertResponseDto = {
  activity: ActivityDetailDto
}
