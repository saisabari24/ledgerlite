import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrintTemplateType, Tenant } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface UpsertPrintTemplateDto {
  name: string;
  type: PrintTemplateType;
  body: string;
  isDefault?: boolean;
}

const LOGO_BASE = '/tenants';

const SAMPLE_DOC = {
  number: 'INV-2024-0001',
  date: '2024-06-15',
  title: 'Sales Invoice',
  type_label: 'Tax Invoice',
  terms: 'Payment due within 30 days. Please quote invoice number for all payments.',
};

const SAMPLE_PARTY = {
  name: 'Acme Corp',
  address: '456 Industrial Zone, Mumbai - 400001',
  gstin: '27AABCA1234N1Z5',
};

interface SampleLine {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

const SAMPLE_LINES: SampleLine[] = [
  { description: 'Widget A - Premium Quality', qty: 10, rate: 1500.00, amount: 15000.00 },
  { description: 'Consulting Services - June 2024', qty: 5, rate: 2000.00, amount: 10000.00 },
  { description: 'Shipping & Handling', qty: 1, rate: 500.00, amount: 500.00 },
];

const SAMPLE_TOTALS = {
  subtotal: 25500.00,
  tax: 4590.00,
  total: 30090.00,
};

@Injectable()
export class PrintTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private getSettingsMap(tenant: Tenant): Record<string, any> {
    const cityState = [tenant.city, tenant.state].filter(Boolean).join(', ');
    const addressLine = [tenant.address, cityState, tenant.pincode].filter(Boolean).join('\n');
    return {
      name: tenant.name ?? '',
      address: addressLine,
      city: tenant.city ?? '',
      state: tenant.state ?? '',
      pincode: tenant.pincode ?? '',
      phone: tenant.phone ?? '',
      email: tenant.tenantEmail ?? '',
      gstin: tenant.gstin ?? '',
      pan: tenant.pan ?? '',
      logoUrl: tenant.logoUrl ? `${LOGO_BASE}/${tenant.id}/logo` : '',
      currency: tenant.currency ?? 'INR',
      terms: tenant.termsAndConditions ?? 'Payment due within 30 days.',
      bankName: tenant.bankName ?? '',
      bankAccountName: tenant.bankAccountName ?? '',
      bankAccountNumber: tenant.bankAccountNumber ?? '',
      bankIfsc: tenant.bankIfsc ?? '',
    };
  }

  private renderTemplate(body: string, data: Record<string, any>): string {
    let html = body;

    // Replace {{key}} placeholders recursively
    const replaceSimple = (text: string, ctx: Record<string, any>, prefix: string = ''): string => {
      return text.replace(/\{\{([^#}]+?)\}\}/g, (match, key: string) => {
        const trimmed = key.trim();
        const fullKey = prefix ? `${prefix}.${trimmed}` : trimmed;

        if (ctx[trimmed] !== undefined && ctx[trimmed] !== null) {
          return String(ctx[trimmed]);
        }

        return match;
      });
    };

    // First pass: dot-notation settings.* replacements
    html = html.replace(/\{\{settings\.([^}]+)\}\}/g, (match, key) => {
      const val = data.settings[key.trim()];
      return val !== undefined && val !== null ? String(val) : match;
    });

    // Backward compat: {{company.*}} → settings
    html = html.replace(/\{\{company\.([^}]+)\}\}/g, (match, key) => {
      const val = data.settings[key.trim()];
      return val !== undefined && val !== null ? String(val) : match;
    });

    // Simple replacements
    html = replaceSimple(html, data.doc, '');
    html = replaceSimple(html, data.party, '');
    html = replaceSimple(html, data.totals, '');

    // Handle {{#each lines}}...{{/each}}
    html = html.replace(/\{\{#each lines\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, block) => {
      const rendered = data.lines.map((line: Record<string, any>, idx: number) => {
        let lineHtml = block;
        lineHtml = lineHtml.replace(/\{\{line\.([^}]+)\}\}/g, (m: string, key: string) => {
          const val = line[key.trim()];
          return val !== undefined && val !== null ? String(val) : m;
        });
        lineHtml = lineHtml.replace(/\{\{index\}\}/g, String(idx + 1));
        return lineHtml;
      });
      return rendered.join('\n');
    });

    return html;
  }

  async render(tenantId: string, templateId: string) {
    const template = await this.prisma.printTemplate.findFirst({
      where: { id: templateId, tenantId },
    });
    if (!template) throw new NotFoundException('Template not found');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const lines = SAMPLE_LINES.map((l, idx) => ({ ...l, index: idx + 1 }));

    const data = {
      settings: this.getSettingsMap(tenant),
      doc: SAMPLE_DOC,
      party: SAMPLE_PARTY,
      lines,
      totals: SAMPLE_TOTALS,
    };

    const html = this.renderTemplate(template.body, data);

    return { html, data };
  }

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

