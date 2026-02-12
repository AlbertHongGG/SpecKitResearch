import { z } from "zod";
import { zId } from "@/lib/validation/common";

export const zAdminCreateBoardBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(0).max(500),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const zAdminUpdateBoardBody = z
  .object({
    boardId: zId.optional(),
    id: zId.optional(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(0).max(500).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
  })
  .refine((v) => !!(v.boardId || v.id), { message: "boardId is required", path: ["boardId"] })
  .transform((v) => ({ ...v, boardId: v.boardId ?? v.id! }));

export const zAdminReorderBoardsBody = z
  .object({
    reorder: z.array(
      z
        .object({
          boardId: zId.optional(),
          id: zId.optional(),
          sortOrder: z.coerce.number().int(),
        })
        .refine((v) => !!(v.boardId || v.id), { message: "boardId is required", path: ["boardId"] })
        .transform((v) => ({ boardId: v.boardId ?? v.id!, sortOrder: v.sortOrder })),
    ),
  })
  .refine((v) => v.reorder.length > 0, { message: "reorder must not be empty", path: ["reorder"] });

export const zAdminSetModeratorBody = z
  .object({
    boardId: zId,
    userId: zId.optional(),
    userEmail: z.string().email().optional(),
    action: z.enum(["assign", "remove"]),
  })
  .refine((v) => !!(v.userId || v.userEmail), { message: "userId or userEmail is required", path: ["userId"] });

export const zAdminSetBanBody = z
  .object({
    userId: zId.optional(),
    userEmail: z.string().email().optional(),
    isBanned: z.boolean().optional(),
    banned: z.boolean().optional(),
    reason: z.string().max(500).optional(),
  })
  .refine((v) => !!(v.userId || v.userEmail), { message: "userId or userEmail is required", path: ["userId"] })
  .refine((v) => typeof (v.isBanned ?? v.banned) === "boolean", {
    message: "isBanned/banned is required",
    path: ["isBanned"],
  })
  .transform((v) => ({ ...v, isBanned: (v.isBanned ?? v.banned)! }));

export const zAdminAuditLogsQuery = z.object({
  actorId: zId.optional(),
  targetType: z.string().max(50).optional(),
  targetId: zId.optional(),
  from: z.string().max(50).optional(),
  to: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
