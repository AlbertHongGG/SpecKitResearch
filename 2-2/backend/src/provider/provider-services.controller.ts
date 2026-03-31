import {
  BadRequestException,
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
} from '@nestjs/common'
import type { Request } from 'express'

import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UserStatusGuard } from '../auth/user-status.guard'
import { ErrorCodes } from '../common/errors/error-codes'
import { ProviderServicesService } from './provider-services.service'

type AuthenticatedRequest = Request & { user?: { id?: string } }

function asBodyRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

@Controller()
export class ProviderServicesController {
  constructor(private readonly services: ProviderServicesService) {}

  @Get('provider/services')
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('PROVIDER')
  async listMine(@Req() req: AuthenticatedRequest) {
    const providerId = req.user?.id
    if (!providerId) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid user' })
    }
    return this.services.listMine(providerId)
  }

  @Get('provider/services/:serviceId')
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('PROVIDER')
  async getMine(@Req() req: AuthenticatedRequest, @Param('serviceId') serviceId: string) {
    const providerId = req.user?.id
    if (!providerId || !serviceId) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid request' })
    }

    const service = await this.services.getMine({ providerId, serviceId })
    return { service }
  }

  @Post('provider/services')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('PROVIDER')
  async create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const providerId = req.user?.id
    const parsedBody = asBodyRecord(body)
    const name = typeof parsedBody.name === 'string' ? parsedBody.name : ''
    const description = typeof parsedBody.description === 'string' ? parsedBody.description : ''
    const durationMinutes =
      typeof parsedBody.durationMinutes === 'number' ? parsedBody.durationMinutes : NaN

    if (!providerId || !name || !Number.isFinite(durationMinutes)) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }

    const service = await this.services.createService({
      providerId,
      name,
      description,
      durationMinutes,
    })

    return { service }
  }

  @Patch('provider/services/:serviceId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('PROVIDER')
  async patch(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
    @Body() body: unknown,
  ) {
    const providerId = req.user?.id
    const parsedBody = asBodyRecord(body)
    if (!providerId || !serviceId) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid request' })
    }

    const service = await this.services.updateService({
      providerId,
      serviceId,
      patch: {
        name: typeof parsedBody.name === 'string' ? parsedBody.name : undefined,
        description:
          typeof parsedBody.description === 'string' ? parsedBody.description : undefined,
        durationMinutes:
          typeof parsedBody.durationMinutes === 'number' ? parsedBody.durationMinutes : undefined,
        status:
          parsedBody.status === 'ACTIVE' || parsedBody.status === 'INACTIVE'
            ? parsedBody.status
            : undefined,
      },
    })

    return { service }
  }
}
