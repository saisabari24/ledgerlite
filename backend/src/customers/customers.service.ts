import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.customer.findFirst({ where: { id, tenantId } });
  }

  async create(
    tenantId: string,
    dto: {
      name: string;
      email?: string;
      phone?: string;
      gstin?: string;
      pan?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
    },
  ) {
    return this.prisma.customer.create({
      data: { tenantId, ...dto },
    });
  }

  async update(tenantId: string, id: string, dto: Record<string, any>) {
    const existing = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Customer not found');

    const allowed = ['name', 'email', 'phone', 'gstin', 'pan', 'address', 'city', 'state', 'pincode'];
    const data: Record<string, any> = {};
    for (const field of allowed) {
      if (dto[field] !== undefined) data[field] = dto[field] === '' ? null : dto[field];
    }

    return this.prisma.customer.update({ where: { id }, data });
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Customer not found');

    const quotes = await this.prisma.salesQuote.count({ where: { customerId: id } });
    const invoices = await this.prisma.salesInvoice.count({ where: { customerId: id } });
    if (quotes > 0 || invoices > 0) {
      throw new NotFoundException(`Customer has ${quotes} quote(s) and ${invoices} invoice(s). Remove them first.`);
    }

    await this.prisma.customer.delete({ where: { id } });
    return { deleted: true };
  }
}
