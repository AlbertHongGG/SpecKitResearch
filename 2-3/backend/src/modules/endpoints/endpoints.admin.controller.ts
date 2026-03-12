import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequireAdminGuard } from '../../guards/require-admin.guard';
import type { SessionPrincipal } from '../../shared/auth/auth.types';

import { AdminEndpointCreateDto, AdminEndpointUpdateDto } from './endpoints.admin.dto';
import { EndpointsService } from './endpoints.service';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

@Controller('admin')
@UseGuards(RequireAdminGuard)
export class EndpointsAdminController {
  constructor(private readonly endpoints: EndpointsService) {}

  @Post('services/:serviceId/endpoints')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('serviceId') serviceId: string,
    @Body() body: AdminEndpointCreateDto,
    @Req() req: RequestWithSession,
  ) {
    return this.endpoints.createForService(req.session!, serviceId, {
      method: body.method,
      path: body.path,
      description: body.description,
      status: body.status ?? 'active'
    });
  }

  @Get('endpoints')
  async list(@Query('service_id') serviceId?: string) {
    return this.endpoints.list({ serviceId });
  }

  @Patch('endpoints/:endpointId')
  async update(
    @Param('endpointId') endpointId: string,
    @Body() body: AdminEndpointUpdateDto,
    @Req() req: RequestWithSession,
  ) {
    return this.endpoints.update(req.session!, endpointId, {
      ...(typeof body.method === 'string' ? { method: body.method } : {}),
      ...(typeof body.path === 'string' ? { path: body.path } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'description') ? { description: body.description as any } : {}),
      ...(typeof body.status === 'string' ? { status: body.status } : {})
    });
  }
}
