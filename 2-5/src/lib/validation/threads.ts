import { z } from "zod";
import { zId } from "@/lib/validation/common";

export const zListThreadsByBoardQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const zCreateThreadBody = z.object({
  boardId: zId,
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50_000),
  intent: z.enum(["save_draft", "publish"]),
});

export const zUpdateThreadBody = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50_000).optional(),
});
