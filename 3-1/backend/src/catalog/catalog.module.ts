import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CatalogController } from './catalog.controller';

@Module({
  imports: [SharedModule],
  controllers: [CatalogController],
})
export class CatalogModule {}
