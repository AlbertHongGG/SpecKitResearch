import { Injectable, PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import type { ZodSchema } from 'zod';

function formatZodPath(path: Array<string | number>): string {
  let out = '';
  for (const seg of path) {
    if (typeof seg === 'number') {
      out += `[${seg}]`;
      continue;
    }
    if (!out) out = seg;
    else out += `.${seg}`;
  }
  return out || 'body';
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        path: formatZodPath(issue.path),
        message: issue.message,
      }));

      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors,
      });
    }
    return parsed.data;
  }
}
