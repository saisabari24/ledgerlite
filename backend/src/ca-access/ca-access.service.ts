import { BadRequestException, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionLevel, UserRole } from '@prisma/client';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Injectable()
export class CaAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async inviteByEmail(
    tenantId: string,
    caEmail: string,
    permissionLevel: PermissionLevel = 'EDIT',
    owner: CurrentUserPayload,
  ) {
    if (owner.role !== 'BUSINESS' || owner.tenantId !== tenantId) {
      throw new ForbiddenException('Only tenant owner can invite CAs');
    }

    const caUser = await this.prisma.user.findFirst({
      where: { email: caEmail.toLowerCase().trim(), role: UserRole.CA },
    });

    if (!caUser) {
      throw new NotFoundException('No CA found with that email. The CA must register first.');
    }

    const existing = await this.prisma.caAccess.findUnique({
      where: {
        caUserId_tenantId: { caUserId: caUser.id, tenantId },
      },
    });

    if (existing) {
      throw new BadRequestException('This CA already has access to your business.');
    }

    return this.prisma.caAccess.create({
      data: { caUserId: caUser.id, tenantId, permissionLevel },
      include: { tenant: true, caUser: { select: { id: true, email: true } } },
    });
  }

  async grant(caUserId: string, tenantId: string, permissionLevel: PermissionLevel = 'EDIT') {
    return this.prisma.caAccess.create({
      data: { caUserId, tenantId, permissionLevel },
      include: { tenant: true, caUser: { select: { id: true, email: true } } },
    });
  }

  async revoke(caUserId: string, tenantId: string) {
    return this.prisma.caAccess.delete({
      where: {
        caUserId_tenantId: { caUserId, tenantId },
      },
    });
  }

  async listForTenant(tenantId: string, user: CurrentUserPayload) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return [];

    // Only tenant owner (business user) or CA with access can list
    const isOwner = user.role === 'BUSINESS' && user.tenantId === tenantId;
    const hasAccess = user.role === 'CA' && (await this.prisma.caAccess.findUnique({
      where: { caUserId_tenantId: { caUserId: user.id, tenantId } },
    }));

    if (!isOwner && !hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.caAccess.findMany({
      where: { tenantId },
      include: { caUser: { select: { id: true, email: true } } },
    });
  }

  async listForCA(caUserId: string) {
    return this.prisma.caAccess.findMany({
      where: { caUserId },
      include: { tenant: true },
    });
  }
}
