import { z } from 'zod';

export { z };

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email().max(320);
export const nonEmptyStringSchema = z.string().min(1);
export const isoDateTimeSchema = z.string().datetime();

export const paginationQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50),
	cursor: z.string().optional()
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
