import { IsOptional, IsString, MinLength } from 'class-validator';

export class ApproveLeaveRequestDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class RejectLeaveRequestDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
