import { z } from "zod";

export const zId = z.string().min(1).max(100);

export const zPage = z.coerce.number().int().min(1).default(1);
export const zPageSize = z.coerce.number().int().min(1).max(100).default(20);

export const zEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email();

export const zPassword = z.string().min(8).max(200);
