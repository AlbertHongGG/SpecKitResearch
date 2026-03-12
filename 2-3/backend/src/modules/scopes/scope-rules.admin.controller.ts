import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequireAdminGuard } from '../../guards/require-admin.guard';
import type { SessionPrincipal } from '../../shared/auth/auth.types';

import { AdminScopeRuleCreateDto } from './scopes.admin.dto';
import { ScopeRulesService } from './scope-rules.service';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

@Controller('admin/scope-rules')
@UseGuards(RequireAdminGuard)
export class ScopeRulesAdminController {
  constructor(private readonly rules: ScopeRulesService) {}

  @Get()
  async list(@Query('scope_id') scopeId?: string, @Query('endpoint_id') endpointId?: string) {
    return this.rules.list({ scopeId, endpointId });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: AdminScopeRuleCreateDto, @Req() req: RequestWithSession) {
    return this.rules.create(req.session!, { scopeId: body.scope_id, endpointId: body.endpoint_id });
  }

  @Delete(':scopeRuleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('scopeRuleId') scopeRuleId: string, @Req() req: RequestWithSession) {
    await this.rules.delete(req.session!, scopeRuleId);
  }
}
