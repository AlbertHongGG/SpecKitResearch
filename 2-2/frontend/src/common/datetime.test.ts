import { describe, expect, it } from 'vitest'

import { formatDateTime } from './datetime'

describe('formatDateTime', () => {
  it('formats an ISO datetime string', () => {
    expect(formatDateTime('2025-01-02T03:04:05')).toBe('2025-01-02 03:04')
  })
})
