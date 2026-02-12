import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
