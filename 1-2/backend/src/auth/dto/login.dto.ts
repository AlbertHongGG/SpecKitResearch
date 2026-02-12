import { IsEmail, IsString, MinLength } from 'class-validator';

export class AuthLoginRequestDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(1)
    password!: string;
}
