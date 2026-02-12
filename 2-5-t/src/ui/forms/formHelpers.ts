import { zodResolver } from "@hookform/resolvers/zod";

export function makeZodResolver(schema: unknown) {
  return zodResolver(schema as any) as any;
}
