import { z } from 'zod';

export class RegisterDto {
  static schema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  });

  email!: string;
  password!: string;
}

export class LoginDto {
  static schema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  email!: string;
  password!: string;
}
