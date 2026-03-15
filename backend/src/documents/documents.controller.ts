import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TenantService } from '../tenant/tenant.service';
import * as multer from 'multer';
import * as path from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = (req as { params?: { tenantId?: string } }).params?.tenantId ?? 'temp';
    const dir = path.join(UPLOADS_DIR, tenantId);
    const fs = require('fs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${randomUUID()}${ext}`);
  },
});

@Controller('tenants/:tenantId/documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly tenantService: TenantService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @Param('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('journalEntryId') journalEntryId: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.documentsService.upload(tenantId, file, user, journalEntryId);
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.documentsService.list(tenantId, user);
  }

  @Get(':id')
  async get(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.documentsService.get(tenantId, id, user);
  }

  @Get(':id/download')
  async download(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    const { path: filePath, doc } = await this.documentsService.getFilePath(tenantId, id, user);
    res.download(filePath, doc.originalName, { headers: { 'Content-Type': doc.mimeType } });
  }

  @Delete(':id')
  async delete(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.documentsService.delete(tenantId, id, user);
  }

  @Post(':id/link')
  async linkToJournal(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body('journalEntryId') journalEntryId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.documentsService.linkToJournal(tenantId, id, journalEntryId, user);
  }
}
