import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface LedgerEntry {
  date: string;
  journalEntryId: string;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccountLedger(
    tenantId: string,
    accountId: string,
    from?: string,
    to?: string,
  ): Promise<{ account: unknown; entries: LedgerEntry[]; openingBalance: number }> {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, tenantId },
    });
    if (!account) {
      return { account: null, entries: [], openingBalance: 0 };
    }

    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date(9999, 11, 31);

    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId,
        journalEntry: {
          tenantId,
          status: 'POSTED',
          date: { gte: fromDate, lte: toDate },
        },
      },
      include: {
        journalEntry: true,
      },
      orderBy: { journalEntry: { date: 'asc' } },
    });

    const openingBalance = await this.getOpeningBalance(tenantId, accountId, fromDate);
    let runningBalance = new Decimal(openingBalance);
    const entries: LedgerEntry[] = [];

    for (const line of lines) {
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      runningBalance = runningBalance.plus(debit).minus(credit);
      entries.push({
        date: line.journalEntry.date.toISOString().split('T')[0],
        journalEntryId: line.journalEntry.id,
        description: line.journalEntry.description,
        debit,
        credit,
        balance: Number(runningBalance),
      });
    }

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        balance: Number(account.balance),
      },
      entries,
      openingBalance,
    };
  }

  private async getOpeningBalance(
    tenantId: string,
    accountId: string,
    beforeDate: Date,
  ): Promise<number> {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId,
        journalEntry: {
          tenantId,
          status: 'POSTED',
          date: { lt: beforeDate },
        },
      },
      include: { journalEntry: true },
    });

    let balance = new Decimal(0);
    for (const line of lines) {
      balance = balance.plus(line.debit).minus(line.credit);
    }
    return Number(balance);
  }

  async getDashboardSummary(tenantId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId },
    });

    const byType = accounts.reduce(
      (acc, a) => {
        const type = a.type;
        if (!acc[type]) acc[type] = new Decimal(0);
        acc[type] = acc[type].plus(a.balance);
        return acc;
      },
      {} as Record<string, Decimal>,
    );

    const totalAssets = Number(byType.ASSET ?? 0);
    const totalLiabilities = Number(byType.LIABILITY ?? 0);
    const totalEquity = Number(byType.EQUITY ?? 0);
    const totalIncome = Number(byType.INCOME ?? 0);
    const totalExpenses = Number(byType.EXPENSE ?? 0);

    const profit = totalIncome - totalExpenses;

    return {
      assets: totalAssets,
      liabilities: totalLiabilities,
      equity: totalEquity,
      income: totalIncome,
      expenses: totalExpenses,
      profit,
      cashBalance: totalAssets, // Simplified; could filter to cash/bank accounts
    };
  }

  async getTrialBalance(tenantId: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const accounts = await this.prisma.account.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });

    const result = await Promise.all(
      accounts.map(async (a) => {
        const balance = await this.getBalanceAsOf(tenantId, a.id, asOfDate);
        const debit = balance >= 0 ? balance : 0;
        const credit = balance < 0 ? -balance : 0;
        return {
          code: a.code,
          name: a.name,
          type: a.type,
          debit,
          credit,
        };
      }),
    );

    const totalDebit = result.reduce((s, r) => s + r.debit, 0);
    const totalCredit = result.reduce((s, r) => s + r.credit, 0);

    return { asOf: asOfDate.toISOString().split('T')[0], rows: result, totalDebit, totalCredit };
  }

  private async getBalanceAsOf(tenantId: string, accountId: string, asOfDate: Date): Promise<number> {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId,
        journalEntry: {
          tenantId,
          status: 'POSTED',
          date: { lte: asOfDate },
        },
      },
    });
    let bal = new Decimal(0);
    for (const l of lines) {
      bal = bal.plus(l.debit).minus(l.credit);
    }
    return Number(bal);
  }

  async getProfitAndLoss(tenantId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const incomeAccounts = await this.prisma.account.findMany({
      where: { tenantId, type: 'INCOME' },
      orderBy: { code: 'asc' },
    });
    const expenseAccounts = await this.prisma.account.findMany({
      where: { tenantId, type: 'EXPENSE' },
      orderBy: { code: 'asc' },
    });

    const getPeriodBalance = async (accountId: string) => {
      const lines = await this.prisma.journalLine.findMany({
        where: {
          accountId,
          journalEntry: {
            tenantId,
            status: 'POSTED',
            date: { gte: fromDate, lte: toDate },
          },
        },
      });
      let bal = new Decimal(0);
      for (const l of lines) {
        bal = bal.plus(l.debit).minus(l.credit);
      }
      return Number(bal);
    };

    const incomeRows = await Promise.all(
      incomeAccounts.map(async (a) => ({
        code: a.code,
        name: a.name,
        amount: await getPeriodBalance(a.id),
      })),
    );
    const expenseRows = await Promise.all(
      expenseAccounts.map(async (a) => ({
        code: a.code,
        name: a.name,
        amount: await getPeriodBalance(a.id),
      })),
    );

    const totalIncome = incomeRows.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenseRows.reduce((s, r) => s + r.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    return {
      from,
      to,
      income: { rows: incomeRows, total: totalIncome },
      expenses: { rows: expenseRows, total: totalExpenses },
      netProfit,
    };
  }

  async getBalanceSheet(tenantId: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const accounts = await this.prisma.account.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });

    const assetAccounts = accounts.filter((a) => a.type === 'ASSET');
    const liabilityAccounts = accounts.filter((a) => a.type === 'LIABILITY');
    const equityAccounts = accounts.filter((a) => a.type === 'EQUITY');

    const assets = await Promise.all(
      assetAccounts.map(async (a) => ({ code: a.code, name: a.name, balance: await this.getBalanceAsOf(tenantId, a.id, asOfDate) })),
    );
    const liabilities = await Promise.all(
      liabilityAccounts.map(async (a) => ({ code: a.code, name: a.name, balance: await this.getBalanceAsOf(tenantId, a.id, asOfDate) })),
    );
    const equity = await Promise.all(
      equityAccounts.map(async (a) => ({ code: a.code, name: a.name, balance: await this.getBalanceAsOf(tenantId, a.id, asOfDate) })),
    );

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const totalEquity = equity.reduce((s, a) => s + a.balance, 0);
    const totalLiabilityEquity = totalLiabilities + totalEquity;

    return {
      asOf: asOfDate.toISOString().split('T')[0],
      assets: { rows: assets, total: totalAssets },
      liabilities: { rows: liabilities, total: totalLiabilities },
      equity: { rows: equity, total: totalEquity },
      totalLiabilityEquity,
    };
  }
}
