import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ErrorCodes } from '../http/error-codes';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }
}
