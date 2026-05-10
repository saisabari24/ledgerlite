import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

function toDecimal(n: number): Decimal {
  return new Decimal(n);
}

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ QUOTES ============

  async listQuotes(tenantId: string) {
    return this.prisma.salesQuote.findMany({
      where: { tenantId },
      include: { customer: true, lines: { include: { item: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getQuote(tenantId: string, id: string) {
    return this.prisma.salesQuote.findFirst({
      where: { id, tenantId },
      include: { customer: true, lines: { include: { item: true } } },
    });
  }

  async createQuote(
    tenantId: string,
    dto: { date: string; customerId: string; description?: string; lines: Array<{ itemId: string; description?: string; quantity: number; rate: number; taxRate?: number }> },
  ) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } });
    if (!customer) throw new BadRequestException('Customer not found');

    const quoteNo = await this.nextNumber(tenantId, 'quote');

    let subtotal = new Decimal(0);
    let tax = new Decimal(0);

    for (const line of dto.lines) {
      const qty = toDecimal(line.quantity ?? 1);
      const rate = toDecimal(line.rate ?? 0);
      const lineSubtotal = qty.times(rate);
      const taxRate = toDecimal(line.taxRate ?? 0);
      const lineTax = lineSubtotal.times(taxRate).dividedBy(100);
      subtotal = subtotal.plus(lineSubtotal);
      tax = tax.plus(lineTax);
    }

    const total = subtotal.plus(tax);

    return this.prisma.salesQuote.create({
      data: {
        tenantId,
        quoteNo,
        date: new Date(dto.date),
        customerId: dto.customerId,
        description: dto.description ?? null,
        subtotal,
        tax,
        total,
        lines: {
          create: dto.lines.map((l) => {
            const qty = toDecimal(l.quantity ?? 1);
            const rate = toDecimal(l.rate ?? 0);
            return {
              itemId: l.itemId,
              description: l.description ?? null,
              quantity: qty,
              rate,
              taxRate: toDecimal(l.taxRate ?? 0),
              amount: qty.times(rate),
            };
          }),
        },
      },
      include: { customer: true, lines: { include: { item: true } } },
    });
  }

  async deleteQuote(tenantId: string, id: string) {
    const q = await this.prisma.salesQuote.findFirst({ where: { id, tenantId } });
    if (!q) throw new NotFoundException('Quote not found');

    await this.prisma.salesQuoteLine.deleteMany({ where: { salesQuoteId: id } });
    await this.prisma.salesQuote.delete({ where: { id } });
    return { deleted: true };
  }

  // ============ INVOICES ============

  async listInvoices(tenantId: string) {
    return this.prisma.salesInvoice.findMany({
      where: { tenantId },
      include: { customer: true, lines: { include: { item: true, account: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getInvoice(tenantId: string, id: string) {
    return this.prisma.salesInvoice.findFirst({
      where: { id, tenantId },
      include: { customer: true, lines: { include: { item: true, account: true } }, allocations: true },
    });
  }

  async createInvoice(
    tenantId: string,
    dto: {
      date: string;
      dueDate?: string;
      customerId: string;
      description?: string;
      terms?: string;
      lines: Array<{ itemId: string; accountId?: string; description?: string; quantity: number; rate: number; taxRate?: number }>;
    },
  ) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } });
    if (!customer) throw new BadRequestException('Customer not found');

    const invoiceNo = await this.nextNumber(tenantId, 'invoice');

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

    return this.prisma.salesInvoice.create({
      data: {
        tenantId,
        invoiceNo,
        date: new Date(dto.date),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        customerId: dto.customerId,
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
      include: { customer: true, lines: { include: { item: true, account: true } } },
    });
  }

  async postInvoice(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findFirst({
        where: { id, tenantId },
        include: { lines: true, customer: true },
      });

      if (!invoice) throw new BadRequestException('Invoice not found');
      if (invoice.status !== 'DRAFT') {
        throw new BadRequestException(`Cannot post invoice with status ${invoice.status}`);
      }
      if (!invoice.lines.length) {
        throw new BadRequestException('Invoice must have at least 1 line');
      }

      const debitAccountId = await this.findOrGetDefaultAccount(tx, tenantId, 'ASSET', 'Accounts Receivable');
      const journalLines: Array<{ accountId: string; debit: Decimal; credit: Decimal }> = [];

      // Total amount goes to A/R (debit)
      const total = new Decimal(invoice.total);
      journalLines.push({ accountId: debitAccountId, debit: total, credit: new Decimal(0) });

      // Each line amount goes to its account (credit)
      for (const line of invoice.lines) {
        const lineAccountId = line.accountId || debitAccountId;
        journalLines.push({ accountId: lineAccountId, debit: new Decimal(0), credit: line.amount });
      }

      // Create journal entry
      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId,
          date: invoice.date,
          description: `Sales Invoice ${invoice.invoiceNo}: ${invoice.customer?.name ?? ''}`,
          status: 'POSTED',
        },
      });

      for (const jl of journalLines) {
        await tx.journalLine.create({
          data: {
            journalEntryId: journalEntry.id,
            accountId: jl.accountId,
            debit: jl.debit,
            credit: jl.credit,
          },
        });
        const account = await tx.account.findFirst({ where: { id: jl.accountId, tenantId } });
        if (account && !account.isGroup) {
          const newBalance = new Decimal(account.balance).plus(jl.debit).minus(jl.credit);
          await tx.account.update({ where: { id: jl.accountId }, data: { balance: newBalance } });
        }
      }

      // Update customer balance
      const customerBalance = new Decimal(invoice.customer.balance).plus(total);
      await tx.customer.update({ where: { id: invoice.customerId }, data: { balance: customerBalance } });

      await tx.salesInvoice.update({
        where: { id },
        data: { status: 'UNPAID', journalEntryId: journalEntry.id },
      });

      return tx.salesInvoice.findUnique({
        where: { id },
        include: { customer: true, lines: { include: { item: true, account: true } }, journalEntry: true },
      });
    });
  }

  async deleteInvoice(tenantId: string, id: string) {
    const inv = await this.prisma.salesInvoice.findFirst({
      where: { id, tenantId },
      include: { journalEntry: { include: { lines: true } } },
    });
    if (!inv) throw new NotFoundException('Invoice not found');

    if (inv.status !== 'DRAFT') {
      return this.prisma.$transaction(async (tx) => {
        // Reverse journal entry
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

        // Reverse customer balance
        const customer = await tx.customer.findFirst({ where: { id: inv.customerId, tenantId } });
        if (customer) {
          const newBal = new Decimal(customer.balance).minus(inv.total);
          await tx.customer.update({ where: { id: inv.customerId }, data: { balance: newBal } });
        }

        await tx.salesInvoiceLine.deleteMany({ where: { salesInvoiceId: id } });
        await tx.salesInvoice.delete({ where: { id } });
        return { deleted: true };
      });
    }

    await this.prisma.salesInvoiceLine.deleteMany({ where: { salesInvoiceId: id } });
    await this.prisma.salesInvoice.delete({ where: { id } });
    return { deleted: true };
  }

  // ============ PAYMENTS ============

  async listPayments(tenantId: string) {
    return this.prisma.salesPayment.findMany({
      where: { tenantId },
      include: { customer: true, account: true, allocations: { include: { salesInvoice: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getPayment(tenantId: string, id: string) {
    return this.prisma.salesPayment.findFirst({
      where: { id, tenantId },
      include: { customer: true, account: true, allocations: { include: { salesInvoice: true } } },
    });
  }

  async createPayment(
    tenantId: string,
    dto: {
      date: string;
      customerId: string;
      mode: string;
      reference?: string;
      amount: number;
      accountId?: string;
      allocations?: Array<{ invoiceId: string; amount: number }>;
    },
  ) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } });
    if (!customer) throw new BadRequestException('Customer not found');

    const paymentNo = await this.nextNumber(tenantId, 'payment');

    const payment = await this.prisma.salesPayment.create({
      data: {
        tenantId,
        paymentNo,
        date: new Date(dto.date),
        customerId: dto.customerId,
        mode: dto.mode,
        reference: dto.reference ?? null,
        amount: toDecimal(dto.amount),
        accountId: dto.accountId ?? null,
        allocations: dto.allocations
          ? {
              create: dto.allocations.map((a) => ({
                salesInvoiceId: a.invoiceId,
                amount: toDecimal(a.amount),
              })),
            }
          : undefined,
      },
      include: { customer: true, account: true, allocations: { include: { salesInvoice: true } } },
    });

    return payment;
  }

  async postPayment(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.salesPayment.findFirst({
        where: { id, tenantId },
        include: { customer: true, account: true, allocations: true },
      });
      if (!payment) throw new BadRequestException('Payment not found');
      if (payment.journalEntryId) throw new BadRequestException('Payment already posted');

      const cashAccountId = payment.accountId || (await this.findOrGetDefaultAccount(tx, tenantId, 'ASSET', 'Bank'));
      const arAccountId = await this.findOrGetDefaultAccount(tx, tenantId, 'ASSET', 'Accounts Receivable');
      const amount = new Decimal(payment.amount);

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId,
          date: payment.date,
          description: `Payment from ${payment.customer?.name ?? ''} (${payment.paymentNo})`,
          status: 'POSTED',
        },
      });

      // Debit bank/cash, Credit A/R
      const jlData = [
        { accountId: cashAccountId, debit: amount, credit: new Decimal(0) },
        { accountId: arAccountId, debit: new Decimal(0), credit: amount },
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

      // Update customer balance (reduce)
      const customerBal = new Decimal(payment.customer.balance).minus(amount);
      await tx.customer.update({ where: { id: payment.customerId }, data: { balance: customerBal } });

      // Update invoice statuses
      for (const alloc of payment.allocations) {
        const inv = await tx.salesInvoice.findFirst({ where: { id: alloc.salesInvoiceId, tenantId } });
        if (inv) {
          const paidSoFar = await tx.salesPaymentAllocation.aggregate({
            where: { salesInvoiceId: inv.id },
            _sum: { amount: true },
          });
          const allocatedTotal = new Decimal(paidSoFar._sum.amount ?? 0);
          const newStatus = allocatedTotal.gte(inv.total) ? 'PAID' : 'PARTIALLY_PAID';
          await tx.salesInvoice.update({ where: { id: inv.id }, data: { status: newStatus } });
        }
      }

      await tx.salesPayment.update({
        where: { id },
        data: { journalEntryId: journalEntry.id },
      });

      return tx.salesPayment.findUnique({
        where: { id },
        include: { customer: true, account: true, allocations: { include: { salesInvoice: true } }, journalEntry: true },
      });
    });
  }

  async deletePayment(tenantId: string, id: string) {
    const pay = await this.prisma.salesPayment.findFirst({ where: { id, tenantId } });
    if (!pay) throw new NotFoundException('Payment not found');

    if (pay.journalEntryId) throw new BadRequestException('Posted payments cannot be deleted. Cancel the journal entry first.');

    await this.prisma.salesPaymentAllocation.deleteMany({ where: { salesPaymentId: id } });
    await this.prisma.salesPayment.delete({ where: { id } });
    return { deleted: true };
  }

  // ============ HELPERS ============

  private async nextNumber(tenantId: string, type: 'quote' | 'invoice' | 'payment'): Promise<string> {
    const prefixMap = { quote: 'Q-', invoice: 'INV-', payment: 'PAY-' };
    const prefix = prefixMap[type];

    const models = { quote: 'salesQuote', invoice: 'salesInvoice', payment: 'salesPayment' } as const;
    const field = models[type];
    const last = await (this.prisma as any)[field].findFirst({
      where: { tenantId },
      orderBy: { [`${type}No`]: 'desc' },
      select: { [`${type}No`]: true },
    });

    if (!last) return `${prefix}0001`;

    const key = `${type}No` as string;
    const match = (last as any)[key].match(new RegExp(`^${prefix}(\\d+)$`));
    if (!match) return `${prefix}0001`;

    const next = parseInt(match[1], 10) + 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  private async findOrGetDefaultAccount(
    tx: any,
    tenantId: string,
    type: string,
    nameHint: string,
  ): Promise<string> {
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
