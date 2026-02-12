import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import type { ZodSchema } from 'zod';

import { ErrorCodes } from '../http/error-codes';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    void metadata;
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        error_code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: result.error.flatten(),
      });
    }
    return result.data;
  }
}
