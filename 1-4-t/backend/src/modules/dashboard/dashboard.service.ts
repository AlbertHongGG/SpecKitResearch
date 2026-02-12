import { Injectable } from '@nestjs/common'
import { Prisma, type TicketStatus as PrismaTicketStatus } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import type { TicketStatus } from '../tickets/ticket.types'

function toDomainTicketStatus(status: PrismaTicketStatus): TicketStatus {
  switch (status) {
    case 'Open':
      return 'Open'
    case 'InProgress':
      return 'In Progress'
    case 'WaitingForCustomer':
      return 'Waiting for Customer'
    case 'Resolved':
      return 'Resolved'
    case 'Closed':
      return 'Closed'
  }
}

const ALL_STATUSES: TicketStatus[] = [
  'Open',
  'In Progress',
  'Waiting for Customer',
  'Resolved',
  'Closed',
]

function rangeToStart(range: 'last_7_days' | 'last_30_days') {
  const days = range === 'last_7_days' ? 7 : 30
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(params: { range: 'last_7_days' | 'last_30_days' }) {
    const start = rangeToStart(params.range)
    const startIso = start.toISOString()

    const firstResponseRows = await this.prisma.$queryRaw<{ avg_ms: number | null }[]>(Prisma.sql`
      WITH tickets_in_range AS (
        SELECT id, created_at
        FROM tickets
        WHERE created_at >= ${startIso}
      ),
      first_public_agent_reply AS (
        SELECT
          m.ticket_id,
          MIN(m.created_at) AS first_reply_at
        FROM ticket_messages m
        JOIN tickets_in_range t ON t.id = m.ticket_id
        WHERE m.is_internal = 0
          AND m.role IN ('Agent', 'Admin')
        GROUP BY m.ticket_id
      ),
      per_ticket AS (
        SELECT
          t.id,
          CASE
            WHEN r.first_reply_at IS NULL THEN NULL
            ELSE (strftime('%s', r.first_reply_at) - strftime('%s', t.created_at)) * 1000
          END AS response_ms
        FROM tickets_in_range t
        LEFT JOIN first_public_agent_reply r ON r.ticket_id = t.id
      )
      SELECT AVG(response_ms) AS avg_ms
      FROM per_ticket
      WHERE response_ms IS NOT NULL;
    `)

    const resolutionRows = await this.prisma.$queryRaw<{ avg_ms: number | null }[]>(Prisma.sql`
      WITH tickets_in_range AS (
        SELECT id, created_at
        FROM tickets
        WHERE created_at >= ${startIso}
      ),
      status_events AS (
        SELECT
          entity_id AS ticket_id,
          created_at,
          json_extract(metadata_json, '$.after.status') AS to_status
        FROM audit_log
        WHERE entity_type = 'Ticket'
          AND action = 'STATUS_CHANGED'
      ),
      first_resolved AS (
        SELECT ticket_id, MIN(created_at) AS first_resolved_at
        FROM status_events
        WHERE to_status = 'Resolved'
        GROUP BY ticket_id
      ),
      per_ticket AS (
        SELECT
          t.id,
          CASE
            WHEN r.first_resolved_at IS NULL THEN NULL
            ELSE (strftime('%s', r.first_resolved_at) - strftime('%s', t.created_at)) * 1000
          END AS resolution_ms
        FROM tickets_in_range t
        LEFT JOIN first_resolved r ON r.ticket_id = t.id
      )
      SELECT AVG(resolution_ms) AS avg_ms
      FROM per_ticket
      WHERE resolution_ms IS NOT NULL;
    `)

    const distributionRows = await this.prisma.ticket.groupBy({
      by: ['status'],
      where: { createdAt: { gte: start } },
      _count: { _all: true },
    })

    const status_distribution: Record<string, number> = Object.fromEntries(
      ALL_STATUSES.map((s) => [s, 0]),
    )

    for (const row of distributionRows) {
      status_distribution[toDomainTicketStatus(row.status)] = row._count._all
    }

    const agentLoadRows = await this.prisma.ticket.groupBy({
      by: ['assigneeId'],
      where: {
        createdAt: { gte: start },
        status: 'InProgress',
        assigneeId: { not: null },
      },
      _count: { _all: true },
    })

    return {
      sla: {
        first_response_time_ms_avg: firstResponseRows[0]?.avg_ms ?? null,
        resolution_time_ms_avg: resolutionRows[0]?.avg_ms ?? null,
      },
      status_distribution,
      agent_load: agentLoadRows
        .filter((r) => r.assigneeId)
        .map((r) => ({ agent_id: r.assigneeId as string, in_progress_count: r._count._all })),
    }
  }
}
