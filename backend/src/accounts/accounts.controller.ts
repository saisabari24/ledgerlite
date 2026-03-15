import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccountsService } from './accounts.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TenantService } from '../tenant/tenant.service';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountType } from '@prisma/client';

class CreateAccountDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  isGroup?: boolean;
}

@Controller('tenants/:tenantId/accounts')
@UseGuards(AuthGuard('jwt'))
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  async list(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.accountsService.listByTenant(tenantId);
  }

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateAccountDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.accountsService.create(
      tenantId,
      dto.code,
      dto.name,
      dto.type,
      dto.parentId,
      dto.isGroup ?? false,
    );
  }

  @Post('seed')
  async seed(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.accountsService.seedDefaultAccounts(tenantId);
  }

  @Get(':accountId')
  async get(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.accountsService.findById(tenantId, accountId);
  }

  @Delete(':accountId')
  async delete(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.accountsService.delete(tenantId, accountId);
  }
}
