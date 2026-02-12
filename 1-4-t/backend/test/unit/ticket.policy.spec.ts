import { assertTicketVisibleOrNotFound, isTicketVisible } from '../../src/modules/tickets/ticket.policy'

describe('ticket policy', () => {
  it('Customer can see own ticket', () => {
    expect(
      isTicketVisible({
        user: { id: 'c1', role: 'Customer' },
        ticket: { customerId: 'c1', assigneeId: null },
      }),
    ).toBe(true)
  })

  it('Customer cannot see others ticket (anti-IDOR => 404)', () => {
    expect(() =>
      assertTicketVisibleOrNotFound({
        user: { id: 'c1', role: 'Customer' },
        ticket: { customerId: 'c2', assigneeId: null },
      }),
    ).toThrow()
  })

  it('Agent can see unassigned', () => {
    expect(
      isTicketVisible({
        user: { id: 'a1', role: 'Agent' },
        ticket: { customerId: 'c1', assigneeId: null },
      }),
    ).toBe(true)
  })

  it('Agent can see assigned to self', () => {
    expect(
      isTicketVisible({
        user: { id: 'a1', role: 'Agent' },
        ticket: { customerId: 'c1', assigneeId: 'a1' },
      }),
    ).toBe(true)
  })

  it('Agent cannot see assigned to others', () => {
    expect(
      isTicketVisible({
        user: { id: 'a1', role: 'Agent' },
        ticket: { customerId: 'c1', assigneeId: 'a2' },
      }),
    ).toBe(false)
  })

  it('Admin can see all', () => {
    expect(
      isTicketVisible({
        user: { id: 'x', role: 'Admin' },
        ticket: { customerId: 'c1', assigneeId: 'a2' },
      }),
    ).toBe(true)
  })
})
