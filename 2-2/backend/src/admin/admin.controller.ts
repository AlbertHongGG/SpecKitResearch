import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'

import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UserStatusGuard } from '../auth/user-status.guard'
import { ErrorCodes } from '../common/errors/error-codes'
import { AdminService } from './admin.service'

type AuthenticatedRequest = Request & { user?: { id?: string } }

function asBodyRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

@Controller()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('admin/users')
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('ADMIN')
  async listUsers() {
    return this.admin.listUsers()
  }

  @Patch('admin/users/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('ADMIN')
  async patchUserStatus(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    const actorUserId = req.user?.id
    const parsedBody = asBodyRecord(body)
    const status =
      parsedBody.status === 'ACTIVE' || parsedBody.status === 'SUSPENDED'
        ? parsedBody.status
        : undefined

    if (!actorUserId || !userId || !status) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid request' })
    }

    const user = await this.admin.updateUserStatus({ actorUserId, userId, status })
    return { user }
  }

  @Get('admin/services')
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('ADMIN')
  async listServices() {
    return this.admin.listServices()
  }

  @Patch('admin/services/:serviceId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('ADMIN')
  async patchServiceStatus(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
    @Body() body: unknown,
  ) {
    const actorUserId = req.user?.id
    const parsedBody = asBodyRecord(body)
    const status =
      parsedBody.status === 'ACTIVE' || parsedBody.status === 'INACTIVE'
        ? parsedBody.status
        : undefined

    if (!actorUserId || !serviceId || !status) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid request' })
    }

    const service = await this.admin.updateServiceStatus({ actorUserId, serviceId, status })
    return { service }
  }

  @Get('admin/reports/summary')
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('ADMIN')
  async summary() {
    return this.admin.getSummaryReport()
  }
}
