import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JournalService, CreateJournalDto } from './journal.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TenantService } from '../tenant/tenant.service';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JournalStatus } from '@prisma/client';

class JournalLineDto {
  @IsString()
  accountId!: string;

  @IsNumber()
  @Min(0)
  debit!: number;

  @IsNumber()
  @Min(0)
  credit!: number;
}

class CreateJournalBodyDto implements CreateJournalDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

@Controller('tenants/:tenantId/journal')
@UseGuards(AuthGuard('jwt'))
export class JournalController {
  constructor(
    private readonly journalService: JournalService,
    private readonly tenantService: TenantService,
  ) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateJournalBodyDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.journalService.create(tenantId, dto);
  }

  @Post(':id/post')
  async post(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.journalService.post(tenantId, id);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.journalService.cancel(tenantId, id);
  }

  @Delete(':id')
  async delete(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.journalService.delete(tenantId, id);
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: JournalStatus,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    if (user) await this.tenantService.assertAccess(user, tenantId);
    return this.journalService.list(tenantId, from, to, status);
  }

  @Get(':id')
  async get(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.journalService.get(tenantId, id);
  }
}
