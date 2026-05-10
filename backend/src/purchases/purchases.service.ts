import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

function toDecimal(n: number): Decimal {
  return new Decimal(n);
}

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ INVOICES ============

  async listInvoices(tenantId: string) {
    return this.prisma.purchaseInvoice.findMany({
      where: { tenantId },
      include: { supplier: true, lines: { include: { item: true, account: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getInvoice(tenantId: string, id: string) {
    return this.prisma.purchaseInvoice.findFirst({
      where: { id, tenantId },
      include: { supplier: true, lines: { include: { item: true, account: true } }, allocations: true },
    });
  }

  async createInvoice(
    tenantId: string,
    dto: {
      date: string;
      dueDate?: string;
      supplierId: string;
      description?: string;
      terms?: string;
      lines: Array<{ itemId: string; accountId?: string; description?: string; quantity: number; rate: number; taxRate?: number }>;
    },
  ) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId } });
    if (!supplier) throw new BadRequestException('Supplier not found');

    const invoiceNo = await this.nextNumber(tenantId);

    let subtotal = new Decimal(0);
    let tax = new Decimal(0);

    for (const line of dto.lines) {
      const qty = toDecimal(line.quantity ?? 1);
      const rate = toDecimal(line.rate ?? 0);
      const lineSubtotal = qty.times(rate);
      const taxRate = toDecimal(line.taxRate ?? 0);
      subtotal = subtotal.plus(lineSubtotal);
      tax = tax.plus(lineSubtotal.times(taxRate).dividedBy(100));
    }

    const total = subtotal.plus(tax);

    return this.prisma.purchaseInvoice.create({
      data: {
        tenantId,
        invoiceNo,
        date: new Date(dto.date),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        supplierId: dto.supplierId,
        description: dto.description ?? null,
        terms: dto.terms ?? null,
        subtotal,
        tax,
        total,
        lines: {
          create: dto.lines.map((l) => {
            const qty = toDecimal(l.quantity ?? 1);
            const rate = toDecimal(l.rate ?? 0);
            return {
              itemId: l.itemId,
              accountId: l.accountId ?? null,
              description: l.description ?? null,
              quantity: qty,
              rate,
              taxRate: toDecimal(l.taxRate ?? 0),
              amount: qty.times(rate),
            };
          }),
        },
      },
      include: { supplier: true, lines: { include: { item: true, account: true } } },
    });
  }

  async postInvoice(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.purchaseInvoice.findFirst({
        where: { id, tenantId },
        include: { lines: true, supplier: true },
      });

      if (!invoice) throw new BadRequestException('Invoice not found');
      if (invoice.status !== 'DRAFT') throw new BadRequestException(`Cannot post invoice with status ${invoice.status}`);
      if (!invoice.lines.length) throw new BadRequestException('Invoice must have at least 1 line');

      const creditAccountId = await this.findOrGetDefaultAccount(tx, tenantId, 'LIABILITY', 'Accounts Payable');
      const total = new Decimal(invoice.total);

      const journalLines: Array<{ accountId: string; debit: Decimal; credit: Decimal }> = [];

      // Each line amount goes to its account (debit - expense/asset)
      for (const line of invoice.lines) {
        const lineAccountId = line.accountId || (await this.findOrGetDefaultAccount(tx, tenantId, 'EXPENSE', 'Cost of Goods'));
        journalLines.push({ accountId: lineAccountId, debit: line.amount, credit: new Decimal(0) });
      }

      // Total amount goes to A/P (credit)
      journalLines.push({ accountId: creditAccountId, debit: new Decimal(0), credit: total });

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId,
          date: invoice.date,
          description: `Purchase Invoice ${invoice.invoiceNo}: ${invoice.supplier?.name ?? ''}`,
          status: 'POSTED',
        },
      });

      for (const jl of journalLines) {
        await tx.journalLine.create({
          data: { journalEntryId: journalEntry.id, accountId: jl.accountId, debit: jl.debit, credit: jl.credit },
        });
        const account = await tx.account.findFirst({ where: { id: jl.accountId, tenantId } });
        if (account && !account.isGroup) {
          const newBalance = new Decimal(account.balance).plus(jl.debit).minus(jl.credit);
          await tx.account.update({ where: { id: jl.accountId }, data: { balance: newBalance } });
        }
      }

      const supplierBal = new Decimal(invoice.supplier.balance).plus(total);
      await tx.supplier.update({ where: { id: invoice.supplierId }, data: { balance: supplierBal } });

      await tx.purchaseInvoice.update({
        where: { id },
        data: { status: 'UNPAID', journalEntryId: journalEntry.id },
      });

      return tx.purchaseInvoice.findUnique({
        where: { id },
        include: { supplier: true, lines: { include: { item: true, account: true } }, journalEntry: true },
      });
    });
  }

  async deleteInvoice(tenantId: string, id: string) {
    const inv = await this.prisma.purchaseInvoice.findFirst({
      where: { id, tenantId },
      include: { journalEntry: { include: { lines: true } } },
    });
    if (!inv) throw new NotFoundException('Invoice not found');

    if (inv.status !== 'DRAFT') {
      return this.prisma.$transaction(async (tx) => {
        if (inv.journalEntry) {
          for (const jl of inv.journalEntry.lines) {
            const account = await tx.account.findFirst({ where: { id: jl.accountId, tenantId } });
            if (account && !account.isGroup) {
              const newBalance = new Decimal(account.balance).minus(jl.debit).plus(jl.credit);
              await tx.account.update({ where: { id: jl.accountId }, data: { balance: newBalance } });
            }
          }
          await tx.journalLine.deleteMany({ where: { journalEntryId: inv.journalEntry.id } });
          await tx.journalEntry.delete({ where: { id: inv.journalEntry.id } });
        }

        const supplier = await tx.supplier.findFirst({ where: { id: inv.supplierId, tenantId } });
        if (supplier) {
          const newBal = new Decimal(supplier.balance).minus(inv.total);
          await tx.supplier.update({ where: { id: inv.supplierId }, data: { balance: newBal } });
        }

        await tx.purchaseInvoiceLine.deleteMany({ where: { purchaseInvoiceId: id } });
        await tx.purchaseInvoice.delete({ where: { id } });
        return { deleted: true };
      });
    }

    await this.prisma.purchaseInvoiceLine.deleteMany({ where: { purchaseInvoiceId: id } });
    await this.prisma.purchaseInvoice.delete({ where: { id } });
    return { deleted: true };
  }

  // ============ PAYMENTS ============

  async listPayments(tenantId: string) {
    return this.prisma.purchasePayment.findMany({
      where: { tenantId },
      include: { supplier: true, account: true, allocations: { include: { purchaseInvoice: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getPayment(tenantId: string, id: string) {
    return this.prisma.purchasePayment.findFirst({
      where: { id, tenantId },
      include: { supplier: true, account: true, allocations: { include: { purchaseInvoice: true } } },
    });
  }

  async createPayment(
    tenantId: string,
    dto: {
      date: string;
      supplierId: string;
      mode: string;
      reference?: string;
      amount: number;
      accountId?: string;
      allocations?: Array<{ invoiceId: string; amount: number }>;
    },
  ) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId } });
    if (!supplier) throw new BadRequestException('Supplier not found');

    const paymentNo = await this.nextPaymentNumber(tenantId);

    return this.prisma.purchasePayment.create({
      data: {
        tenantId,
        paymentNo,
        date: new Date(dto.date),
        supplierId: dto.supplierId,
        mode: dto.mode,
        reference: dto.reference ?? null,
        amount: toDecimal(dto.amount),
        accountId: dto.accountId ?? null,
        allocations: dto.allocations
          ? { create: dto.allocations.map((a) => ({ purchaseInvoiceId: a.invoiceId, amount: toDecimal(a.amount) })) }
          : undefined,
      },
      include: { supplier: true, account: true, allocations: { include: { purchaseInvoice: true } } },
    });
  }

  async postPayment(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.purchasePayment.findFirst({
        where: { id, tenantId },
        include: { supplier: true, account: true, allocations: true },
      });
      if (!payment) throw new BadRequestException('Payment not found');
      if (payment.journalEntryId) throw new BadRequestException('Payment already posted');

      const cashAccountId = payment.accountId || (await this.findOrGetDefaultAccount(tx, tenantId, 'ASSET', 'Bank'));
      const apAccountId = await this.findOrGetDefaultAccount(tx, tenantId, 'LIABILITY', 'Accounts Payable');
      const amount = new Decimal(payment.amount);

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId,
          date: payment.date,
          description: `Payment to ${payment.supplier?.name ?? ''} (${payment.paymentNo})`,
          status: 'POSTED',
        },
      });

      // Debit A/P, Credit bank/cash
      const jlData = [
        { accountId: apAccountId, debit: amount, credit: new Decimal(0) },
        { accountId: cashAccountId, debit: new Decimal(0), credit: amount },
      ];

      for (const jl of jlData) {
        await tx.journalLine.create({
          data: { journalEntryId: journalEntry.id, accountId: jl.accountId, debit: jl.debit, credit: jl.credit },
        });
        const account = await tx.account.findFirst({ where: { id: jl.accountId, tenantId } });
        if (account && !account.isGroup) {
          const newBalance = new Decimal(account.balance).plus(jl.debit).minus(jl.credit);
          await tx.account.update({ where: { id: jl.accountId }, data: { balance: newBalance } });
        }
      }

      const supplierBal = new Decimal(payment.supplier.balance).minus(amount);
      await tx.supplier.update({ where: { id: payment.supplierId }, data: { balance: supplierBal } });

      for (const alloc of payment.allocations) {
        const inv = await tx.purchaseInvoice.findFirst({ where: { id: alloc.purchaseInvoiceId, tenantId } });
        if (inv) {
          const paidSoFar = await tx.purchasePaymentAllocation.aggregate({
            where: { purchaseInvoiceId: inv.id },
            _sum: { amount: true },
          });
          const allocatedTotal = new Decimal(paidSoFar._sum.amount ?? 0);
          const newStatus = allocatedTotal.gte(inv.total) ? 'PAID' : 'PARTIALLY_PAID';
          await tx.purchaseInvoice.update({ where: { id: inv.id }, data: { status: newStatus } });
        }
      }

      await tx.purchasePayment.update({ where: { id }, data: { journalEntryId: journalEntry.id } });

      return tx.purchasePayment.findUnique({
        where: { id },
        include: { supplier: true, account: true, allocations: { include: { purchaseInvoice: true } }, journalEntry: true },
      });
    });
  }

  async deletePayment(tenantId: string, id: string) {
    const pay = await this.prisma.purchasePayment.findFirst({ where: { id, tenantId } });
    if (!pay) throw new NotFoundException('Payment not found');
    if (pay.journalEntryId) throw new BadRequestException('Posted payments cannot be deleted.');

    await this.prisma.purchasePaymentAllocation.deleteMany({ where: { purchasePaymentId: id } });
    await this.prisma.purchasePayment.delete({ where: { id } });
    return { deleted: true };
  }

  // ============ HELPERS ============

  private async nextNumber(tenantId: string): Promise<string> {
    const last = await this.prisma.purchaseInvoice.findFirst({
      where: { tenantId },
      orderBy: { invoiceNo: 'desc' },
      select: { invoiceNo: true },
    });
    if (!last) return 'PINV-0001';
    const match = last.invoiceNo.match(/^PINV-(\d+)$/);
    if (!match) return 'PINV-0001';
    const next = parseInt(match[1], 10) + 1;
    return `PINV-${String(next).padStart(4, '0')}`;
  }

  private async nextPaymentNumber(tenantId: string): Promise<string> {
    const last = await this.prisma.purchasePayment.findFirst({
      where: { tenantId },
      orderBy: { paymentNo: 'desc' },
      select: { paymentNo: true },
    });
    if (!last) return 'PPAY-0001';
    const match = last.paymentNo.match(/^PPAY-(\d+)$/);
    if (!match) return 'PPAY-0001';
    const next = parseInt(match[1], 10) + 1;
    return `PPAY-${String(next).padStart(4, '0')}`;
  }

  private async findOrGetDefaultAccount(tx: any, tenantId: string, type: string, nameHint: string): Promise<string> {
    const account = await tx.account.findFirst({
      where: { tenantId, type: type as any, name: { contains: nameHint }, isGroup: false },
    });
    if (account) return account.id;

    const fallback = await tx.account.findFirst({
      where: { tenantId, isGroup: false, type: type as any },
    });
    if (fallback) return fallback.id;

    throw new BadRequestException(`No suitable ${nameHint} account found. Please create one in Chart of Accounts.`);
  }
}
