import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  AuditAction,
  AuditEntityType,
  TicketStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

type DashboardRange = 'last_7_days' | 'last_30_days';

function rangeToStart(range: DashboardRange): Date {
  const days = range === 'last_7_days' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function secondsBetween(a: Date, b: Date) {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 1000));
}

function average(nums: number[]) {
  if (nums.length === 0) return null;
  const sum = nums.reduce((acc, n) => acc + n, 0);
  return sum / nums.length;
}

function percentile(nums: number[], p: number) {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

function toApiTicketStatus(status: TicketStatus): string {
  switch (status) {
    case TicketStatus.OPEN:
      return 'Open';
    case TicketStatus.IN_PROGRESS:
      return 'In Progress';
    case TicketStatus.WAITING_FOR_CUSTOMER:
      return 'Waiting for Customer';
    case TicketStatus.RESOLVED:
      return 'Resolved';
    case TicketStatus.CLOSED:
      return 'Closed';
  }

  throw new Error(`Unknown status: ${String(status)}`);
}

function isStaffRole(role: UserRole | undefined) {
  return role === UserRole.ADMIN || role === UserRole.AGENT;
}

const AuditMetaSchema = z
  .object({
    from_status: z.string().optional(),
    to_status: z.string().optional(),
  })
  .passthrough();

type AuditMeta = z.infer<typeof AuditMetaSchema>;

function parseAuditMeta(metadataJson: string): AuditMeta | null {
  try {
    const raw: unknown = JSON.parse(metadataJson);
    const parsed = AuditMetaSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(range: DashboardRange) {
    const start = rangeToStart(range);

    const [tickets, audits] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { createdAt: { gte: start } },
        include: {
          messages: {
            include: { author: { select: { role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        where: {
          entityType: AuditEntityType.TICKET,
          createdAt: { gte: start },
        },
        include: { actor: { select: { role: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const ticketIds = new Set(tickets.map((t) => t.id));
    const auditsByTicket = new Map<string, typeof audits>();
    for (const audit of audits) {
      if (!ticketIds.has(audit.entityId)) continue;
      const list = auditsByTicket.get(audit.entityId) ?? [];
      list.push(audit);
      auditsByTicket.set(audit.entityId, list);
    }

    const firstResponseSeconds: number[] = [];
    const resolutionSeconds: number[] = [];

    for (const ticket of tickets) {
      const ticketAudits = auditsByTicket.get(ticket.id) ?? [];

      // Define "cycles" = createdAt + every reopen (Resolved -> In Progress) event.
      const cycleStarts: Date[] = [ticket.createdAt];
      for (const audit of ticketAudits) {
        if (audit.action !== AuditAction.STATUS_CHANGED) continue;
        const meta = parseAuditMeta(audit.metadataJson);
        if (
          meta?.from_status === 'Resolved' &&
          meta?.to_status === 'In Progress'
        ) {
          cycleStarts.push(audit.createdAt);
        }
      }
      cycleStarts.sort((a, b) => a.getTime() - b.getTime());

      for (let i = 0; i < cycleStarts.length; i++) {
        const cycleStart = cycleStarts[i];
        const cycleEnd = cycleStarts[i + 1];

        const withinWindow = (d: Date) =>
          d.getTime() >= cycleStart.getTime() &&
          (!cycleEnd ? true : d.getTime() < cycleEnd.getTime());

        let firstResponseAt: Date | null = null;

        // Staff public messages count as response.
        for (const msg of ticket.messages) {
          if (!withinWindow(msg.createdAt)) continue;
          if (msg.isInternal) continue;
          if (!isStaffRole(msg.author?.role)) continue;
          firstResponseAt = msg.createdAt;
          break;
        }

        // Audit events by staff also count as response (status/assignee changes).
        for (const audit of ticketAudits) {
          if (!withinWindow(audit.createdAt)) continue;
          if (
            audit.action !== AuditAction.STATUS_CHANGED &&
            audit.action !== AuditAction.ASSIGNEE_CHANGED
          )
            continue;
          if (!isStaffRole(audit.actor?.role)) continue;
          if (
            !firstResponseAt ||
            audit.createdAt.getTime() < firstResponseAt.getTime()
          ) {
            firstResponseAt = audit.createdAt;
          }
        }

        if (firstResponseAt) {
          firstResponseSeconds.push(
            secondsBetween(cycleStart, firstResponseAt),
          );
        }

        let resolvedAt: Date | null = null;
        for (const audit of ticketAudits) {
          if (!withinWindow(audit.createdAt)) continue;
          if (audit.action !== AuditAction.STATUS_CHANGED) continue;
          const meta = parseAuditMeta(audit.metadataJson);
          if (meta?.to_status === 'Resolved') {
            resolvedAt = audit.createdAt;
            break;
          }
        }

        if (resolvedAt) {
          resolutionSeconds.push(secondsBetween(cycleStart, resolvedAt));
        }
      }
    }

    const statusGroups = await this.prisma.ticket.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { createdAt: { gte: start } },
    });

    const statusDistribution = statusGroups.map((g) => ({
      status: toApiTicketStatus(g.status),
      count: g._count._all,
    }));

    const agentLoadGroups = await this.prisma.ticket.groupBy({
      by: ['assigneeId'],
      _count: { _all: true },
      where: {
        createdAt: { gte: start },
        status: TicketStatus.IN_PROGRESS,
        assigneeId: { not: null },
      },
    });

    const agentLoad = agentLoadGroups
      .filter((g) => !!g.assigneeId)
      .map((g) => ({
        agent_id: g.assigneeId as string,
        in_progress_count: g._count._all,
      }));

    return {
      sla: {
        first_response_time: {
          avg_seconds: average(firstResponseSeconds),
          p50_seconds: percentile(firstResponseSeconds, 50),
          p90_seconds: percentile(firstResponseSeconds, 90),
        },
        resolution_time: {
          avg_seconds: average(resolutionSeconds),
          p50_seconds: percentile(resolutionSeconds, 50),
          p90_seconds: percentile(resolutionSeconds, 90),
        },
      },
      status_distribution: statusDistribution,
      agent_load: agentLoad,
    };
  }
}
