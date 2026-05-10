import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TenantService } from '../tenant/tenant.service';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StockMovementType } from '@prisma/client';

// ============ Item DTOs ============

class CreateItemDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateItemDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

// ============ Stock Movement DTOs ============

class MovementLineDto {
  @IsString()
  itemId!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsString()
  fromAccountId?: string;

  @IsOptional()
  @IsString()
  toAccountId?: string;
}

class CreateMovementDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(StockMovementType)
  movementType?: StockMovementType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MovementLineDto)
  lines!: MovementLineDto[];
}

@Controller('tenants/:tenantId/inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly tenantService: TenantService,
  ) {}

  // ============ ITEMS ============

  @Get('items')
  async listItems(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.inventoryService.listItems(tenantId);
  }

  @Post('items')
  async createItem(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.inventoryService.createItem(tenantId, dto);
  }

  @Patch('items/:id')
  async updateItem(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.inventoryService.updateItem(tenantId, id, dto);
  }

  @Delete('items/:id')
  async deleteItem(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.inventoryService.deleteItem(tenantId, id);
  }

  // ============ STOCK MOVEMENTS ============

  @Get('stock-movements')
  async listMovements(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.inventoryService.listMovements(tenantId);
  }

  @Post('stock-movements')
  async createMovement(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateMovementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.inventoryService.createMovement(tenantId, dto);
  }

  @Get('stock-movements/:id')
  async getMovement(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.inventoryService.getMovement(tenantId, id);
  }

  @Post('stock-movements/:id/post')
  async postMovement(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.inventoryService.postMovement(tenantId, id);
  }

  @Delete('stock-movements/:id')
  async deleteMovement(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.inventoryService.deleteMovement(tenantId, id);
  }
}
