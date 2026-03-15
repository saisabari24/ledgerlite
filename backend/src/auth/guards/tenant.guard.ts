import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

export const TENANT_KEY = 'tenantId';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const tenantId = request.params[TENANT_KEY] ?? request.body?.tenantId ?? request.query?.tenantId;
    if (!tenantId) return true; // No tenant in request

    // Business user: must belong to tenant
    if (user.role === 'BUSINESS') {
      if (user.tenantId !== tenantId) {
        throw new ForbiddenException('Access denied to this tenant');
      }
      return true;
    }

    // CA user: must have ca_access to tenant
    if (user.role === 'CA') {
      const access = await this.prisma.caAccess.findUnique({
        where: {
          caUserId_tenantId: { caUserId: user.id, tenantId },
        },
      });
      if (!access) {
        throw new ForbiddenException('Access denied to this tenant');
      }
      return true;
    }

    return false;
  }
}
