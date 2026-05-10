import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuppliersService } from './suppliers.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TenantService } from '../tenant/tenant.service';
import { IsOptional, IsString } from 'class-validator';

class CreateSupplierDto {
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

class UpdateSupplierDto {
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

@Controller('tenants/:tenantId/suppliers')
@UseGuards(AuthGuard('jwt'))
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  async list(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.suppliersService.list(tenantId);
  }

  @Post()
  async create(@Param('tenantId') tenantId: string, @Body() dto: CreateSupplierDto, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.suppliersService.create(tenantId, dto);
  }

  @Patch(':id')
  async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: UpdateSupplierDto, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.suppliersService.update(tenantId, id, dto as any);
  }

  @Delete(':id')
  async delete(@Param('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.suppliersService.delete(tenantId, id);
  }
}
