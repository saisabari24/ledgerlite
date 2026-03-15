import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantService } from './tenant.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { IsOptional, IsString } from 'class-validator';

class CreateTenantDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

@Controller('tenants')
@UseGuards(AuthGuard('jwt'))
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  async create(@Body() dto: CreateTenantDto, @CurrentUser() user: CurrentUserPayload) {
    const tenant = await this.tenantService.create(
      dto.name,
      dto.gstin,
      dto.pan,
      dto.currency ?? 'INR',
    );
    return tenant;
  }

  @Get()
  async list(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantService.listForUser(user);
  }

  @Get(':tenantId')
  async get(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.tenantService.findById(tenantId);
  }
}
