import { validateTransition } from '../../src/modules/tickets/ticket.state-machine'

describe('ticket state machine', () => {
  it('allows Open -> In Progress', () => {
    expect(() => validateTransition({ from: 'Open', to: 'In Progress' })).not.toThrow()
  })

  it('rejects Open -> Resolved', () => {
    expect(() => validateTransition({ from: 'Open', to: 'Resolved' })).toThrow()
  })

  it('treats Closed as final', () => {
    expect(() => validateTransition({ from: 'Closed', to: 'Open' })).toThrow()
  })

  it('allows cancel_take: In Progress -> Open', () => {
    expect(() =>
      validateTransition({ from: 'In Progress', to: 'Open' }),
    ).not.toThrow()
  })
})
