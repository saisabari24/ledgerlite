import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { TenantService } from './tenant.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { IsOptional, IsString } from 'class-validator';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads');

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

class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  tenantEmail?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankIfsc?: string;
}

const logoStorage = multer.memoryStorage();

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
    const tenant = await this.tenantService.findById(tenantId);
    // Strip internal fields from response
    return tenant;
  }

  @Patch(':tenantId')
  async update(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.tenantService.update(tenantId, dto as any);
  }

  @Post(':tenantId/logo')
  @UseInterceptors(FileInterceptor('logo', { storage: logoStorage, limits: { fileSize: 2 * 1024 * 1024 } }))
  async uploadLogo(
    @Param('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    if (!file) throw new BadRequestException('No file provided');
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only PNG, JPEG, and WebP images are allowed');
    }
    const logoUrl = await this.tenantService.uploadLogo(tenantId, file);
    return { logoUrl };
  }

  @Delete(':tenantId/logo')
  async removeLogo(@Param('tenantId') tenantId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.tenantService.removeLogo(tenantId);
  }

  @Get(':tenantId/logo')
  async getLogo(@Param('tenantId') tenantId: string, @Res() res: Response, @CurrentUser() user: CurrentUserPayload) {
    await this.tenantService.assertAccess(user, tenantId);
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant?.logoUrl) {
      res.status(404).json({ error: 'No logo uploaded' });
      return;
    }
    const fullPath = path.join(UPLOADS_DIR, tenant.logoUrl);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Logo file not found' });
      return;
    }
    res.sendFile(fullPath);
  }
}
