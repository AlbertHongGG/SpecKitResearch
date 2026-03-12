import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:3000')
});

export type FrontendEnv = z.infer<typeof envSchema>;

export function getFrontendEnv(): FrontendEnv {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL
  });

  if (!parsed.success) {
    throw new Error(`Invalid frontend env: ${parsed.error.message}`);
  }

  return parsed.data;
}
