import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

import { ErrorCodes } from '../errors/error-codes.js';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: err.issues.map((i) => i.message).join(', '),
        });
      }
      throw err;
    }
  }
}
