import { describe, expect, it } from 'vitest'
import { getSafeRedirectTo } from '../../src/pages/login/LoginPage'

describe('login redirectTo safety', () => {
  it('allows only same-site relative paths', () => {
    expect(getSafeRedirectTo(null)).toBe(null)
    expect(getSafeRedirectTo('')).toBe(null)

    expect(getSafeRedirectTo('/tickets')).toBe('/tickets')
    expect(getSafeRedirectTo('/tickets?x=1')).toBe('/tickets?x=1')

    expect(getSafeRedirectTo('https://evil.com')).toBe(null)
    expect(getSafeRedirectTo('http://evil.com')).toBe(null)
    expect(getSafeRedirectTo('//evil.com')).toBe(null)
    expect(getSafeRedirectTo('javascript:alert(1)')).toBe(null)
    expect(getSafeRedirectTo('tickets')).toBe(null)
  })
})
