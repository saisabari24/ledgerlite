import { Module } from '@nestjs/common';
import { CaAccessService } from './ca-access.service';
import { CaAccessController } from './ca-access.controller';

@Module({
  controllers: [CaAccessController],
  providers: [CaAccessService],
  exports: [CaAccessService],
})
export class CaAccessModule {}
