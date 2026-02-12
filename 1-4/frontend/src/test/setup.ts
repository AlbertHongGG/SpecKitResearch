import '@testing-library/jest-dom/vitest'

const originalWarn = console.warn

console.warn = (...args: unknown[]) => {
  const first = args[0]
  if (
    typeof first === 'string' &&
    first.includes('React Router Future Flag Warning')
  ) {
    return
  }

  originalWarn(...args)
}
