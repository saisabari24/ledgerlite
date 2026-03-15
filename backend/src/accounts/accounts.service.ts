import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    code: string,
    name: string,
    type: AccountType,
    parentId?: string,
    isGroup = false,
  ) {
    const existing = await this.prisma.account.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (existing) {
      throw new ConflictException(`Account code ${code} already exists`);
    }

    if (parentId) {
      const parent = await this.prisma.account.findFirst({
        where: { id: parentId, tenantId },
      });
      if (!parent) {
        throw new BadRequestException('Parent account not found for this tenant');
      }
      if (!parent.isGroup) {
        throw new BadRequestException('Parent account must be a group account');
      }
    }

    return this.prisma.account.create({
      data: { tenantId, code, name, type, parentId: parentId ?? null, isGroup },
    });
  }

  async listByTenant(tenantId: string) {
    return this.prisma.account.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.account.findFirst({
      where: { id, tenantId },
    });
  }

  async updateBalance(
    accountId: string,
    debitDelta: Decimal,
    creditDelta: Decimal,
    tx?: Parameters<PrismaService['$transaction']>[0] extends (prisma: infer P) => unknown ? P : never,
  ) {
    const prisma = tx ?? this.prisma;
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('Account not found');

    // Assets/Expenses: debit increases, credit decreases
    // Liabilities/Equity/Income: credit increases, debit decreases
    const netChange = new Decimal(debitDelta).minus(creditDelta);
    const newBalance = new Decimal(account.balance).plus(netChange);

    return prisma.account.update({
      where: { id: accountId },
      data: { balance: newBalance },
    });
  }

  async delete(tenantId: string, id: string) {
    const childrenCount = await this.prisma.account.count({
      where: { tenantId, parentId: id },
    });
    if (childrenCount > 0) {
      throw new BadRequestException('Cannot delete an account that has child accounts');
    }

    const lineCount = await this.prisma.journalLine.count({
      where: { accountId: id },
    });
    if (lineCount > 0) {
      throw new BadRequestException('Cannot delete an account that has journal entries');
    }

    await this.prisma.account.delete({
      where: { id },
    });

    return { deleted: true };
  }

  async seedDefaultAccounts(tenantId: string) {
    // Minimal hierarchical chart of accounts designed from first principles.

    // Assets
    const assetsGroup = await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '1000' } },
      create: { tenantId, code: '1000', name: 'Assets', type: 'ASSET', isGroup: true },
      update: { name: 'Assets', type: 'ASSET', isGroup: true, parentId: null },
    });
    const cashBankGroup = await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '1100' } },
      create: {
        tenantId,
        code: '1100',
        name: 'Cash and Bank',
        type: 'ASSET',
        isGroup: true,
        parentId: assetsGroup.id,
      },
      update: { name: 'Cash and Bank', type: 'ASSET', isGroup: true, parentId: assetsGroup.id },
    });
    await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '1110' } },
      create: {
        tenantId,
        code: '1110',
        name: 'Cash on Hand',
        type: 'ASSET',
        isGroup: false,
        parentId: cashBankGroup.id,
      },
      update: { name: 'Cash on Hand', type: 'ASSET', isGroup: false, parentId: cashBankGroup.id },
    });
    await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '1120' } },
      create: {
        tenantId,
        code: '1120',
        name: 'Bank Account',
        type: 'ASSET',
        isGroup: false,
        parentId: cashBankGroup.id,
      },
      update: { name: 'Bank Account', type: 'ASSET', isGroup: false, parentId: cashBankGroup.id },
    });
    await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '1200' } },
      create: {
        tenantId,
        code: '1200',
        name: 'Accounts Receivable',
        type: 'ASSET',
        isGroup: false,
        parentId: assetsGroup.id,
      },
      update: { name: 'Accounts Receivable', type: 'ASSET', isGroup: false, parentId: assetsGroup.id },
    });

    // Liabilities
    const liabilitiesGroup = await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '2000' } },
      create: { tenantId, code: '2000', name: 'Liabilities', type: 'LIABILITY', isGroup: true },
      update: { name: 'Liabilities', type: 'LIABILITY', isGroup: true, parentId: null },
    });
    await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '2100' } },
      create: {
        tenantId,
        code: '2100',
        name: 'Accounts Payable',
        type: 'LIABILITY',
        isGroup: false,
        parentId: liabilitiesGroup.id,
      },
      update: { name: 'Accounts Payable', type: 'LIABILITY', isGroup: false, parentId: liabilitiesGroup.id },
    });
    await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '2200' } },
      create: {
        tenantId,
        code: '2200',
        name: 'Tax Payable',
        type: 'LIABILITY',
        isGroup: false,
        parentId: liabilitiesGroup.id,
      },
      update: { name: 'Tax Payable', type: 'LIABILITY', isGroup: false, parentId: liabilitiesGroup.id },
    });

    // Equity
    const equityGroup = await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '3000' } },
      create: { tenantId, code: '3000', name: 'Equity', type: 'EQUITY', isGroup: true },
      update: { name: 'Equity', type: 'EQUITY', isGroup: true, parentId: null },
    });
    await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '3100' } },
      create: {
        tenantId,
        code: '3100',
        name: 'Owner Capital',
        type: 'EQUITY',
        isGroup: false,
        parentId: equityGroup.id,
      },
      update: { name: 'Owner Capital', type: 'EQUITY', isGroup: false, parentId: equityGroup.id },
    });

    // Income
    const incomeGroup = await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '4000' } },
      create: { tenantId, code: '4000', name: 'Income', type: 'INCOME', isGroup: true },
      update: { name: 'Income', type: 'INCOME', isGroup: true, parentId: null },
    });
    await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '4100' } },
      create: {
        tenantId,
        code: '4100',
        name: 'Sales Revenue',
        type: 'INCOME',
        isGroup: false,
        parentId: incomeGroup.id,
      },
      update: { name: 'Sales Revenue', type: 'INCOME', isGroup: false, parentId: incomeGroup.id },
    });

    // Expenses
    const expenseGroup = await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '5000' } },
      create: { tenantId, code: '5000', name: 'Expenses', type: 'EXPENSE', isGroup: true },
      update: { name: 'Expenses', type: 'EXPENSE', isGroup: true, parentId: null },
    });

    // Direct Expenses
    const directExpGroup = await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '5100' } },
      create: {
        tenantId,
        code: '5100',
        name: 'Direct Expenses',
        type: 'EXPENSE',
        isGroup: true,
        parentId: expenseGroup.id,
      },
      update: { name: 'Direct Expenses', type: 'EXPENSE', isGroup: true, parentId: expenseGroup.id },
    });
    await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '5110' } },
      create: {
        tenantId,
        code: '5110',
        name: 'Cost of Goods Sold',
        type: 'EXPENSE',
        isGroup: false,
        parentId: directExpGroup.id,
      },
      update: { name: 'Cost of Goods Sold', type: 'EXPENSE', isGroup: false, parentId: directExpGroup.id },
    });
    await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '5120' } },
      create: {
        tenantId,
        code: '5120',
        name: 'Direct Labour',
        type: 'EXPENSE',
        isGroup: false,
        parentId: directExpGroup.id,
      },
      update: { name: 'Direct Labour', type: 'EXPENSE', isGroup: false, parentId: directExpGroup.id },
    });

    // Indirect Expenses
    const indirectExpGroup = await this.prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: '5200' } },
      create: {
        tenantId,
        code: '5200',
        name: 'Indirect Expenses',
        type: 'EXPENSE',
        isGroup: true,
        parentId: expenseGroup.id,
      },
      update: { name: 'Indirect Expenses', type: 'EXPENSE', isGroup: true, parentId: expenseGroup.id },
    });
    const indirectLeaves = [
      { code: '5210', name: 'Administrative Expenses' },
      { code: '5220', name: 'Marketing Expenses' },
      { code: '5230', name: 'Office Rent' },
      { code: '5240', name: 'Utilities Expense' },
      { code: '5250', name: 'Travel Expenses' },
      { code: '5260', name: 'Miscellaneous Expenses' },
    ];
    for (const leaf of indirectLeaves) {
      await this.prisma.account.upsert({
        where: { tenantId_code: { tenantId, code: leaf.code } },
        create: {
          tenantId,
          code: leaf.code,
          name: leaf.name,
          type: 'EXPENSE',
          isGroup: false,
          parentId: indirectExpGroup.id,
        },
        update: { name: leaf.name, type: 'EXPENSE', isGroup: false, parentId: indirectExpGroup.id },
      });
    }

    return this.listByTenant(tenantId);
  }
}
