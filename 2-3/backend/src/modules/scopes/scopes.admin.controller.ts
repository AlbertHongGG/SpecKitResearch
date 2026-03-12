import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequireAdminGuard } from '../../guards/require-admin.guard';
import type { SessionPrincipal } from '../../shared/auth/auth.types';

import { AdminScopeCreateDto, AdminScopeUpdateDto } from './scopes.admin.dto';
import { ScopesService } from './scopes.service';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

@Controller('admin/scopes')
@UseGuards(RequireAdminGuard)
export class ScopesAdminController {
  constructor(private readonly scopes: ScopesService) {}

  @Get()
  async list() {
    return this.scopes.list();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: AdminScopeCreateDto, @Req() req: RequestWithSession) {
    return this.scopes.create(req.session!, { name: body.name, description: body.description });
  }

  @Patch(':scopeId')
  async update(@Param('scopeId') scopeId: string, @Body() body: AdminScopeUpdateDto, @Req() req: RequestWithSession) {
    return this.scopes.update(req.session!, scopeId, {
      ...(typeof body.name === 'string' ? { name: body.name } : {}),
      ...(typeof body.description === 'string' ? { description: body.description } : {})
    });
  }
}
