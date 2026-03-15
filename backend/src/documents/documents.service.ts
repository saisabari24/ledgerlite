import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads');
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(
    tenantId: string,
    file: Express.Multer.File,
    user: CurrentUserPayload,
    journalEntryId?: string,
  ) {
    if (!file || !file.originalname) {
      throw new Error('No file provided');
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new Error('File type not allowed. Use PDF, JPEG, PNG, GIF, or WebP.');
    }

    const filename = path.basename(file.path);
    const storagePath = path.join(tenantId, filename);

    const doc = await this.prisma.document.create({
      data: {
        tenantId,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath,
        journalEntryId: journalEntryId || null,
      },
    });

    return doc;
  }

  async list(tenantId: string, user: CurrentUserPayload) {
    return this.prisma.document.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(tenantId: string, id: string, user: CurrentUserPayload) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async getFilePath(tenantId: string, id: string, user: CurrentUserPayload) {
    const doc = await this.get(tenantId, id, user);
    const fullPath = path.join(UPLOADS_DIR, doc.storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File not found on disk');
    }
    return { path: fullPath, doc };
  }

  async delete(tenantId: string, id: string, user: CurrentUserPayload) {
    const doc = await this.get(tenantId, id, user);
    const fullPath = path.join(UPLOADS_DIR, doc.storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    await this.prisma.document.delete({ where: { id } });
    return { deleted: true };
  }

  async linkToJournal(tenantId: string, docId: string, journalEntryId: string, user: CurrentUserPayload) {
    const doc = await this.get(tenantId, docId, user);
    await this.prisma.document.update({
      where: { id: docId },
      data: { journalEntryId },
    });
    return this.prisma.document.findUnique({ where: { id: docId } });
  }
}
