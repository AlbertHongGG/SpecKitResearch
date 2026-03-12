import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z, type ZodTypeAny } from 'zod';

@Injectable()
export class ZodValidationPipe<TSchema extends ZodTypeAny>
  implements PipeTransform<unknown, z.output<TSchema>>
{
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({ message: 'Validation error', issues: parsed.error.issues });
    }
    return parsed.data;
  }
}
