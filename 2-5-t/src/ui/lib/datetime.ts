import dayjs from "dayjs";

export function formatDateTime(iso: string) {
  return dayjs(iso).format("YYYY-MM-DD HH:mm");
}
