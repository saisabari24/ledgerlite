import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { PrintTemplatesService } from './print-templates.service';
import { PrintTemplatesController } from './print-templates.controller';

@Module({
  imports: [PrismaModule, TenantModule],
  providers: [PrintTemplatesService],
  controllers: [PrintTemplatesController],
})
export class PrintTemplatesModule {}

