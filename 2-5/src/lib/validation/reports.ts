import { z } from "zod";
import { zId } from "@/lib/validation/common";

export const zCreateReportBody = z.object({
  targetType: z.enum(["thread", "post"]),
  targetId: zId,
  reason: z.string().min(1).max(500),
});

export const zListReportsQuery = z.object({
  status: z.enum(["pending", "accepted", "rejected"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const zResolveReportBody = z.object({
  outcome: z.enum(["accepted", "rejected"]),
  note: z.string().max(1000).optional(),
});
