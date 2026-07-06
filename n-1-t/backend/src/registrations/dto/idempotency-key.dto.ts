import { IsOptional, IsString, MinLength } from 'class-validator';

export class IdempotencyKeyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  idempotencyKey?: string;
}
