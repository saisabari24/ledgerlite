import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CaAccessService } from './ca-access.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { PermissionLevel } from '@prisma/client';

class GrantAccessDto {
  @IsString()
  caUserId!: string;

  @IsString()
  tenantId!: string;

  @IsEnum(PermissionLevel)
  permissionLevel?: PermissionLevel;
}

class InviteByEmailDto {
  @IsString()
  tenantId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(PermissionLevel)
  permissionLevel?: PermissionLevel;
}

@Controller('ca-access')
@UseGuards(AuthGuard('jwt'))
export class CaAccessController {
  constructor(private readonly caAccessService: CaAccessService) {}

  @Post('invite-by-email')
  async inviteByEmail(@Body() dto: InviteByEmailDto, @CurrentUser() user: CurrentUserPayload) {
    return this.caAccessService.inviteByEmail(
      dto.tenantId,
      dto.email,
      dto.permissionLevel ?? 'EDIT',
      user,
    );
  }

  @Post('grant')
  async grant(@Body() dto: GrantAccessDto, @CurrentUser() user: CurrentUserPayload) {
    // Only business owner can grant access to their tenant
    if (user.role !== 'BUSINESS' || user.tenantId !== dto.tenantId) {
      throw new ForbiddenException('Only tenant owner can grant CA access');
    }
    return this.caAccessService.grant(
      dto.caUserId,
      dto.tenantId,
      dto.permissionLevel ?? 'EDIT',
    );
  }

  @Delete(':caUserId/:tenantId')
  async revoke(
    @Param('caUserId') caUserId: string,
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (user.role !== 'BUSINESS' || user.tenantId !== tenantId) {
      throw new ForbiddenException('Only tenant owner can revoke CA access');
    }
    return this.caAccessService.revoke(caUserId, tenantId);
  }

  @Get('tenant/:tenantId')
  async listForTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.caAccessService.listForTenant(tenantId, user);
  }

  @Get('my-clients')
  async myClients(@CurrentUser() user: CurrentUserPayload) {
    if (user.role !== 'CA') return [];
    return this.caAccessService.listForCA(user.id);
  }
}
