import { IsString, MinLength } from 'class-validator';

export class RejectRequestDto {
    @IsString()
    @MinLength(1)
    rejectionReason!: string;
}
