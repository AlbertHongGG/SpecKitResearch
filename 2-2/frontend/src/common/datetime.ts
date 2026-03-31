import dayjs from 'dayjs'

export function formatDateTime(iso: string, format = 'YYYY-MM-DD HH:mm') {
  return dayjs(iso).format(format)
}
