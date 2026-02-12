import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { RolesRequired } from '../auth/roles.decorator';
import type { AuthUser } from '../auth/auth.types';
import type { ActivityTransitionAction } from '../activities/activity-state-machine';
import { AdminActivitiesService } from './admin-activities.service';

class ActivityCreateDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  description!: string;

  @Type(() => Date)
  @IsDate()
  date!: Date;

  @Type(() => Date)
  @IsDate()
  deadline!: Date;

  @IsString()
  location!: string;

  @IsInt()
  @Min(1)
  capacity!: number;
}

class ActivityUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

class ActivityTransitionDto {
  @IsString()
  @IsNotEmpty()
  action!: ActivityTransitionAction;
}

@Controller('admin/activities')
@UseGuards(JwtGuard, RolesGuard)
@RolesRequired(Role.admin)
export class AdminActivitiesController {
  constructor(private readonly service: AdminActivitiesService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Post()
  async create(@Req() req: any, @Body() dto: ActivityCreateDto) {
    const user = req.user as AuthUser;
    return this.service.create({
      actorUserId: user.id,
      title: dto.title,
      description: dto.description,
      date: dto.date,
      deadline: dto.deadline,
      location: dto.location,
      capacity: dto.capacity,
    });
  }

  @Patch(':activityId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Req() req: any,
    @Param('activityId') activityId: string,
    @Body() dto: ActivityUpdateDto,
  ) {
    const user = req.user as AuthUser;

    return this.service.update({
      actorUserId: user.id,
      activityId,
      title: dto.title,
      description: dto.description,
      date: dto.date,
      deadline: dto.deadline,
      location: dto.location,
      capacity: dto.capacity,
    });
  }

  @Post(':activityId/transitions')
  @HttpCode(HttpStatus.OK)
  async transition(
    @Req() req: any,
    @Param('activityId') activityId: string,
    @Body() dto: ActivityTransitionDto,
  ) {
    const user = req.user as AuthUser;
    return this.service.transition({
      actorUserId: user.id,
      activityId,
      action: dto.action,
    });
  }
}
