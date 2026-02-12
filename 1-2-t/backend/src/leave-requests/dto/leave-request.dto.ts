import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateLeaveRequestDto {
  @IsUUID()
  @IsString()
  leave_type_id!: string;

  @IsString()
  @Matches(DATE_ONLY_RE)
  start_date!: string;

  @IsString()
  @Matches(DATE_ONLY_RE)
  end_date!: string;

  @IsString()
  @MinLength(1)
  reason!: string;

  @IsOptional()
  @IsUUID()
  @IsString()
  attachment_id?: string;
}

export class UpdateLeaveRequestDto {
  @IsOptional()
  @IsUUID()
  @IsString()
  leave_type_id?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_RE)
  start_date?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_RE)
  end_date?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;

  @IsOptional()
  @IsUUID()
  @IsString()
  attachment_id?: string | null;
}
