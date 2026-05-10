import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PurchasesService } from './purchases.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TenantService } from '../tenant/tenant.service';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class InvoiceLineDto {
  @IsString() itemId!: string;
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0.01) quantity!: number;
  @IsNumber() @Min(0) rate!: number;
  @IsOptional() @IsNumber() @Min(0) taxRate?: number;
}

class CreateInvoiceDto {
  @IsDateString() date!: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsString() supplierId!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() terms?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceLineDto) lines!: InvoiceLineDto[];
}

class PaymentAllocationDto {
  @IsString() invoiceId!: string;
  @IsNumber() @Min(0.01) amount!: number;
}

class CreatePaymentDto {
  @IsDateString() date!: string;
  @IsString() supplierId!: string;
  @IsString() mode!: string;
  @IsOptional() @IsString() reference?: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PaymentAllocationDto) allocations?: PaymentAllocationDto[];
}

@Controller('tenants/:tenantId/purchases')
@UseGuards(AuthGuard('jwt'))
export class PurchasesController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly tenantService: TenantService,
  ) {}

  @Get('invoices')
  async listInvoices(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.purchasesService.listInvoices(tenantId);
  }

  @Post('invoices')
  async createInvoice(@Param('tenantId') tenantId: string, @Body() dto: CreateInvoiceDto, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.purchasesService.createInvoice(tenantId, dto);
  }

  @Get('invoices/:id')
  async getInvoice(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.purchasesService.getInvoice(tenantId, id);
  }

  @Post('invoices/:id/post')
  async postInvoice(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.purchasesService.postInvoice(tenantId, id);
  }

  @Delete('invoices/:id')
  async deleteInvoice(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.purchasesService.deleteInvoice(tenantId, id);
  }

  @Get('payments')
  async listPayments(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.purchasesService.listPayments(tenantId);
  }

  @Post('payments')
  async createPayment(@Param('tenantId') tenantId: string, @Body() dto: CreatePaymentDto, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.purchasesService.createPayment(tenantId, dto);
  }

  @Get('payments/:id')
  async getPayment(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.purchasesService.getPayment(tenantId, id);
  }

  @Post('payments/:id/post')
  async postPayment(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.purchasesService.postPayment(tenantId, id);
  }

  @Delete('payments/:id')
  async deletePayment(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.purchasesService.deletePayment(tenantId, id);
  }
}
