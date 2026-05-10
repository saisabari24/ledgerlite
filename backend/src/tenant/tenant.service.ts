import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads');

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, gstin?: string, pan?: string, currency = 'INR') {
    return this.prisma.tenant.create({
      data: { name, gstin, pan, currency },
    });
  }

  async findById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: { _count: { select: { accounts: true, journalEntries: true } } },
    });
  }

  async update(tenantId: string, dto: Record<string, any>) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const allowedFields = [
      'name', 'gstin', 'pan', 'currency',
      'address', 'city', 'state', 'pincode', 'phone', 'tenantEmail',
      'termsAndConditions',
      'bankName', 'bankAccountName', 'bankAccountNumber', 'bankIfsc',
    ];

    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        data[field] = dto[field] === '' ? null : dto[field];
      }
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  async uploadLogo(tenantId: string, file: Express.Multer.File): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Remove old logo if exists
    if (tenant.logoUrl) {
      const oldPath = path.join(UPLOADS_DIR, tenant.logoUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const dir = path.join(UPLOADS_DIR, tenantId, 'logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.originalname) || '.png';
    const filename = `logo${ext}`;
    const storagePath = path.join(tenantId, 'logos', filename);

    fs.writeFileSync(path.join(UPLOADS_DIR, storagePath), file.buffer);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl: storagePath },
    });

    return storagePath;
  }

  async removeLogo(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (tenant.logoUrl) {
      const fullPath = path.join(UPLOADS_DIR, tenant.logoUrl);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl: null },
    });

    return { deleted: true };
  }

  async listForUser(user: CurrentUserPayload) {
    if (user.role === 'BUSINESS') {
      if (!user.tenantId) return [];
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
      });
      return tenant ? [tenant] : [];
    }

    if (user.role === 'CA') {
      return this.prisma.tenant.findMany({
        where: {
          caAccess: {
            some: { caUserId: user.id },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    return [];
  }

  async canAccess(user: CurrentUserPayload, tenantId: string): Promise<boolean> {
    if (user.role === 'BUSINESS') {
      return user.tenantId === tenantId;
    }
    if (user.role === 'CA') {
      const access = await this.prisma.caAccess.findUnique({
        where: {
          caUserId_tenantId: { caUserId: user.id, tenantId },
        },
      });
      return !!access;
    }
    return false;
  }

  async assertAccess(user: CurrentUserPayload, tenantId: string) {
    const ok = await this.canAccess(user, tenantId);
    if (!ok) {
      throw new ForbiddenException('Access denied to this tenant');
    }
  }
}
