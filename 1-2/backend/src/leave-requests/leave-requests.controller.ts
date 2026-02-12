import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CsrfGuard } from '../auth/csrf/csrf.guard';
import { CurrentUser } from '../common/http/current-user.decorator';
import { LeaveRequestDraftUpsertDto } from './dto/leave-request-draft.dto';
import { LeaveRequestsService } from './leave-requests.service';
import { toLeaveRequestDetail, toLeaveRequestSummary } from './leave-requests.mapper';

@Controller('me/leave-requests')
@UseGuards(AuthGuard)
export class LeaveRequestsController {
    constructor(private readonly service: LeaveRequestsService) { }

    @Get()
    async list(
        @CurrentUser() user: { id: string },
        @Query('status') status?: string,
        @Query('leaveTypeId') leaveTypeId?: string,
        @Query('start') start?: string,
        @Query('end') end?: string,
        @Query('sort') sort?: string,
    ) {
        const items = await this.service.listMy(user.id, { status, leaveTypeId, start, end, sort });
        return { items: items.map(toLeaveRequestSummary) };
    }

    @UseGuards(CsrfGuard)
    @Post()
    async createDraft(@CurrentUser() user: { id: string }, @Body() body: LeaveRequestDraftUpsertDto) {
        const { request, attachment } = await this.service.createDraft(user.id, body);
        return toLeaveRequestDetail({
            request,
            employee: (request as any).user,
            leaveType: (request as any).leaveType,
            approver: (request as any).approver,
            attachment,
        });
    }

    @Get(':id')
    async detail(@CurrentUser() user: { id: string }, @Param('id') id: string) {
        const full = await this.service.getMyDetail(user.id, id);
        const attachment = full.attachments?.[0] ?? null;
        return toLeaveRequestDetail({
            request: full,
            employee: full.user,
            leaveType: full.leaveType,
            approver: full.approver,
            attachment,
        });
    }

    @UseGuards(CsrfGuard)
    @Patch(':id')
    async updateDraft(
        @CurrentUser() user: { id: string },
        @Param('id') id: string,
        @Body() body: LeaveRequestDraftUpsertDto,
    ) {
        const { request, attachment } = await this.service.updateDraft(user.id, id, body);
        return toLeaveRequestDetail({
            request,
            employee: (request as any).user,
            leaveType: (request as any).leaveType,
            approver: (request as any).approver,
            attachment,
        });
    }

    @UseGuards(CsrfGuard)
    @Post(':id/submit')
    @HttpCode(200)
    async submit(@CurrentUser() user: { id: string }, @Param('id') id: string) {
        const updated = await this.service.submit(user.id, id);
        const full = await this.service.getMyDetail(user.id, updated.id);
        const attachment = full.attachments?.[0] ?? null;
        return toLeaveRequestDetail({
            request: full,
            employee: full.user,
            leaveType: full.leaveType,
            approver: full.approver,
            attachment,
        });
    }

    @UseGuards(CsrfGuard)
    @Post(':id/cancel')
    @HttpCode(200)
    async cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
        const updated = await this.service.cancel(user.id, id);
        const full = await this.service.getMyDetail(user.id, updated.id);
        const attachment = full.attachments?.[0] ?? null;
        return toLeaveRequestDetail({
            request: full,
            employee: full.user,
            leaveType: full.leaveType,
            approver: full.approver,
            attachment,
        });
    }
}
