import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { CurrentUser } from '../common/http/current-user.decorator';
import { CalendarService } from './calendar.service';

@Controller('manager/calendar')
@UseGuards(AuthGuard, RolesGuard)
@Roles('manager')
export class CalendarController {
    constructor(private readonly calendar: CalendarService) { }

    @Get()
    async getManagerCalendar(
        @CurrentUser() user: { id: string },
        @Query('view') view: 'month' | 'week',
        @Query('start') start: string,
        @Query('end') end: string,
        @Query('includeSubmitted') includeSubmitted?: string,
    ) {
        const items = await this.calendar.getManagerCalendar(user.id, {
            view,
            start,
            end,
            includeSubmitted: includeSubmitted === 'true',
        });

        return { items };
    }
}
