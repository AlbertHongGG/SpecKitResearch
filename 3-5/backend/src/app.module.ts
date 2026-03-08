import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeysController } from './modules/api-keys/api-keys.controller';
import { ApiKeyScopesService } from './modules/api-keys/api-key-scopes.service';
import { ApiKeysRotationService } from './modules/api-keys/api-keys.rotation.service';
import { ApiKeysService } from './modules/api-keys/api-keys.service';
import { AdminModule } from './modules/admin/admin.module';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { MeController } from './modules/auth/me.controller';
import { CatalogController } from './modules/catalog/catalog.controller';
import { DemoController } from './modules/demo/demo.controller';
import { UsageLogsController } from './modules/usage-logs/usage-logs.controller';
import { UsageStatsController } from './modules/usage-logs/usage-stats.controller';
import { UsageLogsRepository } from './modules/usage-logs/usage-logs.repository';
import { GatewayModule } from './gateway/gateway.module';
import { PrismaService } from './shared/db/prisma.service';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [SharedModule, GatewayModule, AdminModule],
  controllers: [
    AppController,
    AuthController,
    MeController,
    ApiKeysController,
    CatalogController,
    UsageLogsController,
    UsageStatsController,
    DemoController
  ],
  providers: [
    AppService,
    AuthService,
    ApiKeysService,
    ApiKeyScopesService,
    ApiKeysRotationService,
    UsageLogsRepository
  ],
})
export class AppModule {
  constructor(private readonly prisma: PrismaService) {}
}
