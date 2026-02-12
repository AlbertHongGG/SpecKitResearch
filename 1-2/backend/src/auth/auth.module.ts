import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password/password.service';
import { CsrfController } from './csrf/csrf.controller';
import { RefreshService } from './refresh/refresh.service';

@Global()
@Module({
    imports: [JwtModule.register({})],
    controllers: [AuthController, CsrfController],
    providers: [AuthService, PasswordService, RefreshService],
    exports: [AuthService],
})
export class AuthModule { }
