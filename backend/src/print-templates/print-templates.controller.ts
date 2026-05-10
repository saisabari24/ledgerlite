import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrintTemplateType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TenantService } from '../tenant/tenant.service';
import { PrintTemplatesService, UpsertPrintTemplateDto } from './print-templates.service';

class CreatePrintTemplateDto implements UpsertPrintTemplateDto {
  @IsString()
  name!: string;

  @IsEnum(PrintTemplateType)
  type!: PrintTemplateType;

  @IsString()
  body!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

class UpdatePrintTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(PrintTemplateType)
  type?: PrintTemplateType;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@Controller('tenants/:tenantId/print-templates')
@UseGuards(AuthGuard('jwt'))
export class PrintTemplatesController {
  constructor(
    private readonly printTemplatesService: PrintTemplatesService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  async list(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.printTemplatesService.list(tenantId);
  }

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreatePrintTemplateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.printTemplatesService.create(tenantId, dto);
  }

  @Patch(':id')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePrintTemplateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.printTemplatesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  async delete(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.printTemplatesService.delete(tenantId, id);
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.printTemplatesService.duplicate(tenantId, id);
  }

  @Post(':id/set-default')
  async setDefault(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.printTemplatesService.setDefault(tenantId, id);
  }
}

