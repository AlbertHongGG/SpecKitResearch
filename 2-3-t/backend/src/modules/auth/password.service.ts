import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import { getConfig } from '../../common/config/config';

@Injectable()
export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    const config = getConfig(process.env);
    if (password.length < config.passwordMinLength) {
      throw new BadRequestException('Password too short');
    }
    return argon2.hash(password);
  }

  async verifyPassword(hash: string, password: string) {
    const ok = await argon2.verify(hash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
  }
}
