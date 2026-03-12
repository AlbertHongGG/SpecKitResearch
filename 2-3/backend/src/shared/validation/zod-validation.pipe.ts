import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';

import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';

export type ZodSchemaLike = z.ZodTypeAny;

export interface ZodDtoClass {
  // DTO class can expose a static zod schema for global validation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: ZodSchemaLike;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    const metatype = metadata.metatype as unknown as ZodDtoClass | undefined;
    const schema = metatype?.schema;

    if (!schema) return value;

    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: 'bad_request',
          message: 'Invalid request body'
        },
        issues: parsed.error.issues
      });
    }

    return parsed.data;
  }
}
