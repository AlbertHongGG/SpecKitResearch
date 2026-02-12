import { Injectable } from '@nestjs/common'
import bcrypt from 'bcrypt'

@Injectable()
export class PasswordService {
  async verify(params: { password: string; passwordHash: string }) {
    return bcrypt.compare(params.password, params.passwordHash)
  }
}
