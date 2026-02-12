import type { z } from 'zod';

export function zodResolver<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return async (values: unknown) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const fieldErrors: Record<string, any> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'root';
      fieldErrors[path] = { type: issue.code, message: issue.message };
    }

    return { values: {}, errors: fieldErrors };
  };
}
