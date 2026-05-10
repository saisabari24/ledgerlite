import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService } from './customers.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TenantService } from '../tenant/tenant.service';
import { IsOptional, IsString } from 'class-validator';

class CreateCustomerDto {
  @IsString() name!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() pincode?: string;
}

class UpdateCustomerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() pincode?: string;
}

@Controller('tenants/:tenantId/customers')
@UseGuards(AuthGuard('jwt'))
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  async list(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.customersService.list(tenantId);
  }

  @Post()
  async create(@Param('tenantId') tenantId: string, @Body() dto: CreateCustomerDto, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.customersService.create(tenantId, dto);
  }

  @Patch(':id')
  async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.customersService.update(tenantId, id, dto as any);
  }

  @Delete(':id')
  async delete(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.customersService.delete(tenantId, id);
  }
}
