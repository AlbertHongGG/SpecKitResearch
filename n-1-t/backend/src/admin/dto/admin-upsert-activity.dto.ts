import { IsInt, IsString, Min, MinLength, IsDateString } from 'class-validator';

export class AdminUpsertActivityDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(1)
  location!: string;

  @IsDateString()
  deadline!: string;

  @IsInt()
  @Min(1)
  capacity!: number;
}
