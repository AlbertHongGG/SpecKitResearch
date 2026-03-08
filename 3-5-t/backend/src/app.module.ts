import { Module } from '@nestjs/common';

import { DbModule } from './common/db/db.module';
import { AuthModule } from './modules/auth/auth.module';
import { KeysModule } from './modules/keys/keys.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { RbacGuard } from './common/security/rbac.guard';
import { LogsModule } from './modules/logs/logs.module';

@Module({
  imports: [DbModule, LogsModule, AuthModule, KeysModule, CatalogModule, GatewayModule, AdminModule, HealthModule],
  providers: [RbacGuard],
})
export class AppModule {}
