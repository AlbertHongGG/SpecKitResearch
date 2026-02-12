import { z } from 'zod';

const zEnv = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:3001'),
});

export type WebConfig = z.infer<typeof zEnv>;

export function loadWebConfig(env: Record<string, string | undefined> = process.env): WebConfig {
  return zEnv.parse(env);
}
