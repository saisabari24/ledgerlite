import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SalesService } from './sales.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TenantService } from '../tenant/tenant.service';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ============ DTOs ============

class QuoteLineDto {
  @IsString() itemId!: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0.01) quantity!: number;
  @IsNumber() @Min(0) rate!: number;
  @IsOptional() @IsNumber() @Min(0) taxRate?: number;
}

class CreateQuoteDto {
  @IsDateString() date!: string;
  @IsString() customerId!: string;
  @IsOptional() @IsString() description?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => QuoteLineDto) lines!: QuoteLineDto[];
}

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
  @IsString() customerId!: string;
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
  @IsString() customerId!: string;
  @IsString() mode!: string;
  @IsOptional() @IsString() reference?: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PaymentAllocationDto) allocations?: PaymentAllocationDto[];
}

@Controller('tenants/:tenantId/sales')
@UseGuards(AuthGuard('jwt'))
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly tenantService: TenantService,
  ) {}

  // ============ QUOTES ============

  @Get('quotes')
  async listQuotes(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.listQuotes(tenantId);
  }

  @Post('quotes')
  async createQuote(@Param('tenantId') tenantId: string, @Body() dto: CreateQuoteDto, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.createQuote(tenantId, dto);
  }

  @Get('quotes/:id')
  async getQuote(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.getQuote(tenantId, id);
  }

  @Delete('quotes/:id')
  async deleteQuote(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.deleteQuote(tenantId, id);
  }

  // ============ INVOICES ============

  @Get('invoices')
  async listInvoices(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.listInvoices(tenantId);
  }

  @Post('invoices')
  async createInvoice(@Param('tenantId') tenantId: string, @Body() dto: CreateInvoiceDto, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.createInvoice(tenantId, dto);
  }

  @Get('invoices/:id')
  async getInvoice(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.getInvoice(tenantId, id);
  }

  @Post('invoices/:id/post')
  async postInvoice(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.postInvoice(tenantId, id);
  }

  @Delete('invoices/:id')
  async deleteInvoice(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.deleteInvoice(tenantId, id);
  }

  // ============ PAYMENTS ============

  @Get('payments')
  async listPayments(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.listPayments(tenantId);
  }

  @Post('payments')
  async createPayment(@Param('tenantId') tenantId: string, @Body() dto: CreatePaymentDto, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.createPayment(tenantId, dto);
  }

  @Get('payments/:id')
  async getPayment(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.getPayment(tenantId, id);
  }

  @Post('payments/:id/post')
  async postPayment(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.postPayment(tenantId, id);
  }

  @Delete('payments/:id')
  async deletePayment(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.salesService.deletePayment(tenantId, id);
  }
}
