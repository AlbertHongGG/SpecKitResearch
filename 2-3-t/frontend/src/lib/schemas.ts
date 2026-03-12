import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['developer', 'admin']),
  status: z.enum(['active', 'disabled']),
});

export const SessionResponseSchema = z.object({
  authenticated: z.boolean(),
  user: UserSchema.optional(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export type Session = {
  user: z.infer<typeof UserSchema>;
};

export const KeySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  secretLast4: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
  // Backend canonical fields (after apiFetch camelization)
  rateLimitPerMinute: z.number().nullable().optional(),
  rateLimitPerHour: z.number().nullable().optional(),
  scopes: z.array(z.string()).optional(),
  replacedByKeyId: z.string().nullable().optional(),
}).transform((k) => ({
  ...k,
  minuteLimit: k.rateLimitPerMinute ?? null,
  hourLimit: k.rateLimitPerHour ?? null,
  scopeKeys: k.scopes ?? [],
}));

export const KeysListSchema = z.object({
  keys: z.array(KeySchema),
});
