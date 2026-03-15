import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

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
