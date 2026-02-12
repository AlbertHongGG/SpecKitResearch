import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class LeaveRequestDraftUpsertDto {
    @IsUUID()
    leaveTypeId!: string;

    @IsString()
    @MinLength(10)
    startDate!: string; // YYYY-MM-DD

    @IsString()
    @MinLength(10)
    endDate!: string; // YYYY-MM-DD

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsUUID()
    attachmentId?: string;
}
