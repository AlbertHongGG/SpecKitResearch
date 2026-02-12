import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { ErrorCodes, makeFieldError } from '@app/contracts';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodTypeAny) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'root';
      fieldErrors[key] ??= [];
      fieldErrors[key].push(issue.message);
    }

    throw new BadRequestException(
      makeFieldError(ErrorCodes.VALIDATION_ERROR, '欄位驗證失敗', fieldErrors),
    );
  }
}
