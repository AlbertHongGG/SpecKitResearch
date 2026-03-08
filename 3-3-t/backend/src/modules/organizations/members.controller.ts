import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { MembersRepository } from './members.repository';
import { AuditEventsService } from '../audit/audit-events.service';

@Controller('org/members')
export class MembersController {
  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly auditEvents: AuditEventsService,
  ) {}

  @Get()
  async list(@Req() req: any) {
    return this.membersRepository.list(req.orgId);
  }

  @Post()
  async invite(
    @Req() req: any,
    @Body() body: { userId: string; role: 'END_USER' | 'ORG_ADMIN' },
  ) {
    const member = await this.membersRepository.add(req.orgId, body.userId, body.role);
    await this.auditEvents.append(req, 'MEMBER_INVITED', 'OrganizationMember', member.id, body);
    return member;
  }

  @Patch(':id/role')
  async changeRole(@Req() req: any, @Param('id') id: string, @Body() body: { role: 'END_USER' | 'ORG_ADMIN' }) {
    const member = await this.membersRepository.updateRole(id, body.role);
    await this.auditEvents.append(req, 'MEMBER_ROLE_CHANGED', 'OrganizationMember', id, body);
    return member;
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const member = await this.membersRepository.remove(id);
    await this.auditEvents.append(req, 'MEMBER_REMOVED', 'OrganizationMember', id, {});
    return member;
  }
}
