import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('leave-types')
@UseGuards(AuthGuard)
export class LeaveTypesController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    async list() {
        const items = await this.prisma.leaveType.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });

        return {
            items: items.map((t) => ({
                id: t.id,
                name: t.name,
                annualQuota: t.annualQuota,
                carryOver: t.carryOver,
                requireAttachment: t.requireAttachment,
                isActive: t.isActive,
            })),
        };
    }
}
