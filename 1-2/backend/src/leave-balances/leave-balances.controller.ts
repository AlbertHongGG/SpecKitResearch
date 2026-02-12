import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../common/http/current-user.decorator';

@Controller('me/leave-balances')
@UseGuards(AuthGuard)
export class LeaveBalancesController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    async list(@CurrentUser() user: { id: string }, @Query('year') yearStr: string) {
        const year = Number(yearStr);
        const balances = await this.prisma.leaveBalance.findMany({
            where: { userId: user.id, year },
            orderBy: { createdAt: 'asc' },
        });

        return {
            items: balances.map((b) => ({
                leaveTypeId: b.leaveTypeId,
                year: b.year,
                quota: b.quota,
                used: b.usedDays,
                reserved: b.reservedDays,
                available: b.quota - b.usedDays - b.reservedDays,
            })),
        };
    }
}
