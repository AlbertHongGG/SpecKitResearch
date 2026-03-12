import { Module } from '@nestjs/common';

import { SharedModule } from '../shared/shared.module';

import { EndpointResolverService } from './endpoint-resolver.service';
import { GatewayController } from './gateway.controller';
import { GatewayEndpointResolveGuard } from './gateway-endpoint-resolve.guard';
import { ServiceRoutingService } from './service-routing.service';

@Module({
  imports: [SharedModule],
  controllers: [GatewayController],
  providers: [
    EndpointResolverService,
    GatewayEndpointResolveGuard,
    ServiceRoutingService,
  ],
})
export class GatewayModule {}
