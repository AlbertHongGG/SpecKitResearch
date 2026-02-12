import { Injectable } from '@nestjs/common'
import type {
	AuditAction,
	AuditEntityType,
	Prisma,
	Role,
	TicketCategory,
	TicketStatus as PrismaTicketStatus,
} from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { transactionWithSqliteRetry } from '../../common/prisma/sqlite-retry'
import { DomainError } from '../../common/errors/domain-error'
import { ERROR_CODES } from '../../common/errors/error-codes'
import { AuditService } from '../audit/audit.service'
import { assertTicketVisibleOrNotFound } from './ticket.policy'
import type { TicketStatus, UserRole } from './ticket.types'

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

function toPrismaTicketStatus(status: TicketStatus): PrismaTicketStatus {
	switch (status) {
		case 'Open':
			return 'Open'
		case 'In Progress':
			return 'InProgress'
		case 'Waiting for Customer':
			return 'WaitingForCustomer'
		case 'Resolved':
			return 'Resolved'
		case 'Closed':
			return 'Closed'
	}
}

function toUserRole(role: Role): UserRole {
	return role
}

function buildUserSummary(user: { id: string; email: string; role: Role }) {
	return { id: user.id, email: user.email, role: toUserRole(user.role) }
}

function buildMessage(msg: {
	id: string
	ticketId: string
	author: { id: string; email: string; role: Role }
	role: Role
	content: string
	isInternal: boolean
	createdAt: Date
}) {
	return {
		id: msg.id,
		ticket_id: msg.ticketId,
		author: buildUserSummary(msg.author),
		role: toUserRole(msg.role),
		content: msg.content,
		is_internal: msg.isInternal,
		created_at: msg.createdAt.toISOString(),
	}
}

@Injectable()
export class TicketsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
	) {}

	async createTicket(params: {
		customerId: string
		title: string
		category: TicketCategory
		description: string
	}) {
		const created = await transactionWithSqliteRetry(this.prisma, async (tx) => {
			const ticket = await tx.ticket.create({
				data: {
					title: params.title,
					category: params.category,
					status: 'Open',
					customerId: params.customerId,
					assigneeId: null,
					closedAt: null,
				},
				select: { id: true },
			})

			const message = await tx.ticketMessage.create({
				data: {
					ticketId: ticket.id,
					authorId: params.customerId,
					role: 'Customer',
					content: params.description,
					isInternal: false,
				},
				select: { id: true },
			})

			await this.audit.append({
				tx,
				entityType: 'Ticket' as AuditEntityType,
				entityId: ticket.id,
				action: 'TICKET_CREATED' as AuditAction,
				actorId: params.customerId,
				metadata: {
					ticket_id: ticket.id,
					after: {
						status: 'Open',
						assignee_id: null,
					},
				},
			})

			await this.audit.append({
				tx,
				entityType: 'TicketMessage' as AuditEntityType,
				entityId: message.id,
				action: 'MESSAGE_CREATED' as AuditAction,
				actorId: params.customerId,
				metadata: {
					ticket_id: ticket.id,
					message: {
						id: message.id,
						is_internal: false,
					},
				},
			})

			return { ticketId: ticket.id }
		})

		return this.getDetail({
			ticketId: created.ticketId,
			user: { id: params.customerId, role: 'Customer' },
		})
	}

	async listForCustomer(params: {
		customerId: string
		status?: TicketStatus
		limit: number
		offset: number
	}) {
		const where: Prisma.TicketWhereInput = {
			customerId: params.customerId,
		}
		if (params.status) {
			where.status = toPrismaTicketStatus(params.status)
		}

		const [items, total] = await Promise.all([
			this.prisma.ticket.findMany({
				where,
				orderBy: { updatedAt: 'desc' },
				skip: params.offset,
				take: params.limit,
				include: {
					assignee: { select: { id: true, email: true, role: true } },
				},
			}),
			this.prisma.ticket.count({ where }),
		])

		return {
			items: items.map((t) => ({
				id: t.id,
				title: t.title,
				category: t.category,
				status: toDomainTicketStatus(t.status),
				updated_at: t.updatedAt.toISOString(),
				assignee: t.assignee ? buildUserSummary(t.assignee) : null,
			})),
			total,
			limit: params.limit,
			offset: params.offset,
		}
	}

	async getDetail(params: { ticketId: string; user: { id: string; role: UserRole } }) {
		const ticket = await this.prisma.ticket.findUnique({
			where: { id: params.ticketId },
			include: {
				customer: { select: { id: true, email: true, role: true } },
				assignee: { select: { id: true, email: true, role: true } },
				messages: {
					orderBy: { createdAt: 'asc' },
					include: { author: { select: { id: true, email: true, role: true } } },
				},
			},
		})

		if (!ticket) {
			throw new DomainError({
				code: ERROR_CODES.NOT_FOUND,
				message: 'Not Found',
				status: 404,
			})
		}

		assertTicketVisibleOrNotFound({
			user: params.user,
			ticket: { customerId: ticket.customerId, assigneeId: ticket.assigneeId },
		})

		const messages =
			params.user.role === 'Customer'
				? ticket.messages.filter((m) => !m.isInternal)
				: ticket.messages

		return {
			ticket: {
				id: ticket.id,
				title: ticket.title,
				category: ticket.category,
				status: toDomainTicketStatus(ticket.status),
				customer: buildUserSummary(ticket.customer),
				assignee: ticket.assignee ? buildUserSummary(ticket.assignee) : null,
				created_at: ticket.createdAt.toISOString(),
				updated_at: ticket.updatedAt.toISOString(),
				closed_at: ticket.closedAt ? ticket.closedAt.toISOString() : null,
				messages: messages.map((m) =>
					buildMessage({
						id: m.id,
						ticketId: m.ticketId,
						author: m.author,
						role: m.role,
						content: m.content,
						isInternal: m.isInternal,
						createdAt: m.createdAt,
					}),
				),
			},
		}
	}
}
