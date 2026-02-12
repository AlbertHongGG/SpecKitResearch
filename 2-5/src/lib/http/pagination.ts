import { z } from "zod";
import { zPage, zPageSize } from "@/lib/validation/common";

const schema = z.object({
  page: zPage,
  pageSize: zPageSize,
});

export function parsePagination(url: string) {
  const u = new URL(url);
  const page = u.searchParams.get("page") ?? undefined;
  const pageSize = u.searchParams.get("pageSize") ?? undefined;
  return schema.parse({ page, pageSize });
}
