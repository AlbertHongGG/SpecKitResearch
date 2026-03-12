import { Module } from '@nestjs/common';

import { AdminServicesController } from './admin.services.controller';
import { AdminEndpointsController } from './admin.endpoints.controller';
import { AdminScopesController } from './admin.scopes.controller';
import { AdminScopeRulesController } from './admin.scope-rules.controller';
import { DocsController } from './docs.controller';

@Module({
  controllers: [
    AdminServicesController,
    AdminEndpointsController,
    AdminScopesController,
    AdminScopeRulesController,
    DocsController,
  ],
})
export class CatalogModule {}
