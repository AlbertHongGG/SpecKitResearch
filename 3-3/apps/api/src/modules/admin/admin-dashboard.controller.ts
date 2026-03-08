import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';
import { PrismaService } from '../db/prisma.service';

@Controller('admin/dashboard')
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async dashboard() {
    const [orgCount, userCount] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count(),
    ]);

    const [activeSubscriptions, pastDueSubscriptions, suspendedSubscriptions, expiredSubscriptions] = await Promise.all([
      this.prisma.subscription.count({ where: { status: 'Active', isCurrent: true } }),
      this.prisma.subscription.count({ where: { status: 'PastDue', isCurrent: true } }),
      this.prisma.subscription.count({ where: { status: 'Suspended', isCurrent: true } }),
      this.prisma.subscription.count({ where: { status: 'Expired', isCurrent: true } }),
    ]);

    const openInvoices = await this.prisma.invoice.count({ where: { status: 'Open' } });

    const revenueAgg = await this.prisma.invoice.aggregate({
      where: { status: 'Paid' },
      _sum: { totalCents: true },
    });

    return {
      orgCount,
      userCount,
      activeSubscriptions,
      pastDueSubscriptions,
      suspendedSubscriptions,
      expiredSubscriptions,
      openInvoices,
      revenueTotalCents: revenueAgg._sum.totalCents ?? 0,
    };
  }
}
