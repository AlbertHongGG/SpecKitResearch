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
            include: {
                leaveType: {
                    select: {
                        id: true,
                        name: true,
                        annualQuota: true,
                        carryOver: true,
                        requireAttachment: true,
                        isActive: true,
                    },
                },
            },
        });

        return {
            items: balances.map((b) => ({
                id: b.id,
                leaveType: b.leaveType,
                year: b.year,
                quota: b.quota,
                usedDays: b.usedDays,
                reservedDays: b.reservedDays,
            })),
        };
    }
}
