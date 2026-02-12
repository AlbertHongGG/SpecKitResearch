import type { RegistrationRosterItemDto } from '../dto/roster.dto'

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

export function exportRosterCsv(items: RegistrationRosterItemDto[]): string {
  const header = ['name', 'email', 'registered_at'].join(',')
  const lines = items.map((i) => [escapeCsv(i.name), escapeCsv(i.email), escapeCsv(i.registered_at)].join(','))
  return [header, ...lines].join('\n') + '\n'
}
