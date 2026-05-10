import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrintTemplateType } from '@prisma/client';

export interface UpsertPrintTemplateDto {
  name: string;
  type: PrintTemplateType;
  body: string;
  isDefault?: boolean;
}

@Injectable()
export class PrintTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.printTemplate.findMany({
      where: { tenantId },
      orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async create(tenantId: string, dto: UpsertPrintTemplateDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.printTemplate.updateMany({
          where: { tenantId, type: dto.type, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.printTemplate.create({
        data: {
          tenantId,
          name: dto.name,
          type: dto.type,
          body: dto.body,
          isDefault: dto.isDefault ?? false,
          isCustom: true,
        },
      });
    });
  }

  async update(tenantId: string, id: string, dto: Partial<UpsertPrintTemplateDto>) {
    const existing = await this.prisma.printTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const nextType = dto.type ?? existing.type;
      const nextIsDefault = dto.isDefault ?? existing.isDefault;

      if (nextIsDefault) {
        await tx.printTemplate.updateMany({
          where: { tenantId, type: nextType, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.printTemplate.update({
        where: { id },
        data: {
          name: dto.name ?? existing.name,
          type: nextType,
          body: dto.body ?? existing.body,
          isDefault: nextIsDefault,
        },
      });
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.printTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    if (existing.isDefault) {
      const countDefaults = await this.prisma.printTemplate.count({
        where: {
          tenantId,
          type: existing.type,
          isDefault: true,
        },
      });

      if (countDefaults <= 1) {
        throw new BadRequestException('Cannot delete the last default template for this document type');
      }
    }

    await this.prisma.printTemplate.delete({
      where: { id },
    });

    return { success: true };
  }

  async duplicate(tenantId: string, id: string, overrides?: { name?: string }) {
    const existing = await this.prisma.printTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    return this.prisma.printTemplate.create({
      data: {
        tenantId,
        name: overrides?.name ?? `${existing.name} (Copy)`,
        type: existing.type,
        body: existing.body,
        isDefault: false,
        isCustom: true,
        engine: existing.engine,
      },
    });
  }

  async setDefault(tenantId: string, id: string) {
    const existing = await this.prisma.printTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.printTemplate.updateMany({
        where: { tenantId, type: existing.type, isDefault: true },
        data: { isDefault: false },
      });

      return tx.printTemplate.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }
}

