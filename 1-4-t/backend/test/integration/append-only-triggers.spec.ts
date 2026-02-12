import { AuditAction, AuditEntityType, Role } from '@prisma/client'
import { createTestDb } from '../test-utils'

describe('append-only triggers', () => {
  it('rejects update/delete on ticket_messages and audit_log', async () => {
    const { prisma, cleanup } = await createTestDb()

    try {
      const user = await prisma.user.create({
        data: {
          email: 'u@example.com',
          passwordHash: 'x',
          role: Role.Customer,
          isActive: true,
        },
      })

      const ticket = await prisma.ticket.create({
        data: {
          title: 't',
          category: 'Other',
          status: 'Open',
          customerId: user.id,
        },
      })

      const msg = await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: user.id,
          role: Role.Customer,
          content: 'hello',
          isInternal: false,
        },
      })

      const audit = await prisma.auditLog.create({
        data: {
          entityType: AuditEntityType.Ticket,
          entityId: ticket.id,
          action: AuditAction.TICKET_CREATED,
          actorId: user.id,
          metadataJson: JSON.stringify({}),
        },
      })

      await expect(
        prisma.ticketMessage.update({
          where: { id: msg.id },
          data: { content: 'changed' },
        }),
      ).rejects.toBeTruthy()

      await expect(
        prisma.ticketMessage.delete({ where: { id: msg.id } }),
      ).rejects.toBeTruthy()

      await expect(
        prisma.auditLog.update({
          where: { id: audit.id },
          data: { metadataJson: JSON.stringify({ changed: true }) },
        }),
      ).rejects.toBeTruthy()

      await expect(prisma.auditLog.delete({ where: { id: audit.id } })).rejects.toBeTruthy()
    } finally {
      await cleanup()
    }
  })
})
