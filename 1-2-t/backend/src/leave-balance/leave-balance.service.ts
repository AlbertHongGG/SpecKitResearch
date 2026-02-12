import { ConflictException, Injectable } from '@nestjs/common';
import { LedgerType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class LeaveBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalanceItems(userId: string, year: number) {
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const balances = await this.prisma.leaveBalance.findMany({
      where: { userId, year },
    });

    const byLeaveTypeId = new Map(balances.map((b) => [b.leaveTypeId, b]));

    const ensured = [];
    for (const lt of leaveTypes) {
      const existing = byLeaveTypeId.get(lt.id);
      if (existing) {
        ensured.push({ lt, b: existing });
        continue;
      }

      const created = await this.prisma.leaveBalance.create({
        data: {
          userId,
          leaveTypeId: lt.id,
          year,
          quota: lt.annualQuota,
          usedDays: 0,
          reservedDays: 0,
        },
      });
      ensured.push({ lt, b: created });
    }

    return ensured.map(({ lt, b }) => ({
      leave_type: {
        id: lt.id,
        name: lt.name,
        annual_quota: lt.annualQuota,
        carry_over: lt.carryOver,
        require_attachment: lt.requireAttachment,
        is_active: lt.isActive,
      },
      quota: b.quota,
      used: b.usedDays,
      reserved: b.reservedDays,
      available: b.quota - b.usedDays - b.reservedDays,
    }));
  }

  async reserveDaysTx(
    tx: PrismaService,
    params: {
      userId: string;
      leaveTypeId: string;
      year: number;
      leaveRequestId: string;
      days: number;
    },
  ) {
    const leaveType = await tx.leaveType.findUnique({
      where: { id: params.leaveTypeId },
    });
    if (!leaveType)
      throw new ConflictException({
        code: 'validation_error',
        message: 'Invalid leave_type_id',
      });

    const balance = await tx.leaveBalance.upsert({
      where: {
        userId_leaveTypeId_year: {
          userId: params.userId,
          leaveTypeId: params.leaveTypeId,
          year: params.year,
        },
      },
      update: {},
      create: {
        userId: params.userId,
        leaveTypeId: params.leaveTypeId,
        year: params.year,
        quota: leaveType.annualQuota,
        usedDays: 0,
        reservedDays: 0,
      },
    });

    const available = balance.quota - balance.usedDays - balance.reservedDays;
    if (available < params.days) {
      throw new ConflictException({
        code: 'conflict',
        message: 'Insufficient leave balance',
      });
    }

    await tx.leaveBalanceLedger.create({
      data: {
        leaveBalanceId: balance.id,
        leaveRequestId: params.leaveRequestId,
        type: LedgerType.reserve,
        days: params.days,
      },
    });

    await tx.leaveBalance.update({
      where: { id: balance.id },
      data: { reservedDays: { increment: params.days } },
    });
  }

  async releaseReserveTx(
    tx: PrismaService,
    params: { leaveRequestId: string; days: number },
  ) {
    const ledger = await tx.leaveBalanceLedger.findUnique({
      where: {
        leaveRequestId_type: {
          leaveRequestId: params.leaveRequestId,
          type: LedgerType.reserve,
        },
      },
    });
    if (!ledger) {
      throw new ConflictException({
        code: 'conflict',
        message: 'No reserve to release',
      });
    }

    await tx.leaveBalanceLedger.create({
      data: {
        leaveBalanceId: ledger.leaveBalanceId,
        leaveRequestId: params.leaveRequestId,
        type: LedgerType.release_reserve,
        days: params.days,
      },
    });
    await tx.leaveBalance.update({
      where: { id: ledger.leaveBalanceId },
      data: { reservedDays: { decrement: params.days } },
    });
  }

  async deductReservedTx(
    tx: PrismaService,
    params: { leaveRequestId: string; days: number },
  ) {
    const reserveLedger = await tx.leaveBalanceLedger.findUnique({
      where: {
        leaveRequestId_type: {
          leaveRequestId: params.leaveRequestId,
          type: LedgerType.reserve,
        },
      },
    });
    if (!reserveLedger) {
      throw new ConflictException({
        code: 'conflict',
        message: 'No reserve to deduct',
      });
    }

    await tx.leaveBalanceLedger.create({
      data: {
        leaveBalanceId: reserveLedger.leaveBalanceId,
        leaveRequestId: params.leaveRequestId,
        type: LedgerType.deduct,
        days: params.days,
      },
    });

    await tx.leaveBalance.update({
      where: { id: reserveLedger.leaveBalanceId },
      data: {
        reservedDays: { decrement: params.days },
        usedDays: { increment: params.days },
      },
    });
  }
}
