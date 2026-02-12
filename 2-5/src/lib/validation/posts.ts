import { z } from "zod";
import { zId } from "@/lib/validation/common";

export const zListPostsByThreadQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(200).optional(),
});

export const zCreatePostBody = z.object({
  threadId: zId,
  content: z.string().min(1).max(50_000),
});

export const zUpdatePostBody = z.object({
  content: z.string().min(1).max(50_000),
});
