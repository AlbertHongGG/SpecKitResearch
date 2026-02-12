import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: parsed.error.issues.map((i) => ({
          code: 'VALIDATION_ERROR',
          message: i.message,
          path: i.path
        }))
      });
    }
    return parsed.data;
  }
}
