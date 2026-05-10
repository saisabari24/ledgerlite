import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.supplier.findFirst({ where: { id, tenantId } });
  }

  async create(tenantId: string, dto: { name: string; email?: string; phone?: string; gstin?: string; pan?: string; address?: string; city?: string; state?: string; pincode?: string }) {
    return this.prisma.supplier.create({ data: { tenantId, ...dto } });
  }

  async update(tenantId: string, id: string, dto: Record<string, any>) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Supplier not found');

    const allowed = ['name', 'email', 'phone', 'gstin', 'pan', 'address', 'city', 'state', 'pincode'];
    const data: Record<string, any> = {};
    for (const field of allowed) {
      if (dto[field] !== undefined) data[field] = dto[field] === '' ? null : dto[field];
    }

    return this.prisma.supplier.update({ where: { id }, data });
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Supplier not found');

    const invoices = await this.prisma.purchaseInvoice.count({ where: { supplierId: id } });
    if (invoices > 0) {
      throw new NotFoundException(`Supplier has ${invoices} invoice(s). Remove them first.`);
    }

    await this.prisma.supplier.delete({ where: { id } });
    return { deleted: true };
  }
}
