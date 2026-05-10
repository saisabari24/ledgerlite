import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { CaAccessModule } from './ca-access/ca-access.module';
import { AccountsModule } from './accounts/accounts.module';
import { JournalModule } from './journal/journal.module';
import { LedgerModule } from './ledger/ledger.module';
import { DocumentsModule } from './documents/documents.module';
import { PrintTemplatesModule } from './print-templates/print-templates.module';
import { InventoryModule } from './inventory/inventory.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SalesModule } from './sales/sales.module';
import { PurchasesModule } from './purchases/purchases.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantModule,
    CaAccessModule,
    AccountsModule,
    JournalModule,
    LedgerModule,
    DocumentsModule,
    PrintTemplatesModule,
    InventoryModule,
    CustomersModule,
    SuppliersModule,
    SalesModule,
    PurchasesModule,
  ],
})
export class AppModule {}
