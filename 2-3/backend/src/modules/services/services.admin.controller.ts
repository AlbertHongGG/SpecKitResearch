import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequireAdminGuard } from '../../guards/require-admin.guard';
import type { SessionPrincipal } from '../../shared/auth/auth.types';

import { AdminServiceCreateDto, AdminServiceUpdateDto } from './services.admin.dto';
import { ServicesService } from './services.service';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

@Controller('admin/services')
@UseGuards(RequireAdminGuard)
export class ServicesAdminController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  async list() {
    return this.services.list();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: AdminServiceCreateDto, @Req() req: RequestWithSession) {
    const created = await this.services.create(req.session!, {
      name: body.name,
      description: body.description,
      status: body.status ?? 'active'
    });
    return created;
  }

  @Patch(':serviceId')
  async update(@Param('serviceId') serviceId: string, @Body() body: AdminServiceUpdateDto, @Req() req: RequestWithSession) {
    return this.services.update(req.session!, serviceId, {
      ...(typeof body.name === 'string' ? { name: body.name } : {}),
      ...(typeof body.description === 'string' ? { description: body.description } : {}),
      ...(typeof body.status === 'string' ? { status: body.status } : {})
    });
  }
}
