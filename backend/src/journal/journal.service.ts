import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JournalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
}

export interface CreateJournalDto {
  date: string;
  description?: string;
  lines: JournalLineInput[];
}

function toDecimal(n: number): Decimal {
  return new Decimal(n);
}

function validateLines(lines: JournalLineInput[]): void {
  if (!lines || lines.length < 2) {
    throw new BadRequestException('Journal entry must contain at least 2 lines');
  }

  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  for (const line of lines) {
    const debit = toDecimal(line.debit ?? 0);
    const credit = toDecimal(line.credit ?? 0);

    if (debit.lt(0) || credit.lt(0)) {
      throw new BadRequestException('Debit and credit must be non-negative');
    }
    if (debit.gt(0) && credit.gt(0)) {
      throw new BadRequestException('Each line must have either debit OR credit, not both');
    }
    if (debit.eq(0) && credit.eq(0)) {
      throw new BadRequestException('Each line must have a debit or credit amount');
    }

    totalDebit = totalDebit.plus(debit);
    totalCredit = totalCredit.plus(credit);
  }

  if (!totalDebit.eq(totalCredit)) {
    throw new BadRequestException(`Total debit (${totalDebit}) must equal total credit (${totalCredit})`);
  }
}

@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(tenantId: string, dto: CreateJournalDto) {
    validateLines(dto.lines);

    return this.prisma.$transaction(async (tx) => {
      const accounts = await tx.account.findMany({
        where: { id: { in: dto.lines.map((l) => l.accountId) }, tenantId },
      });
      const byId = new Map(accounts.map((a) => [a.id, a]));
      for (const line of dto.lines) {
        const acc = byId.get(line.accountId);
        if (!acc) {
          throw new BadRequestException(`Account ${line.accountId} not found for this tenant`);
        }
        if (acc.isGroup) {
          throw new BadRequestException('Journal lines cannot be posted to group accounts');
        }
      }

      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          date: new Date(dto.date),
          description: dto.description ?? null,
          status: 'DRAFT',
        },
      });

      for (const line of dto.lines) {
        await tx.journalLine.create({
          data: {
            journalEntryId: entry.id,
            accountId: line.accountId,
            debit: toDecimal(line.debit ?? 0),
            credit: toDecimal(line.credit ?? 0),
          },
        });
      }

      return tx.journalEntry.findUnique({
        where: { id: entry.id },
        include: { lines: { include: { account: true } } },
      });
    });
  }

  async post(tenantId: string, journalEntryId: string) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.findFirst({
        where: { id: journalEntryId, tenantId },
        include: { lines: true },
      });

      if (!entry) {
        throw new BadRequestException('Journal entry not found');
      }
      if (entry.status !== 'DRAFT') {
        throw new BadRequestException(`Cannot post entry with status ${entry.status}`);
      }

      validateLines(
        entry.lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit),
          credit: Number(l.credit),
        })),
      );

      for (const line of entry.lines) {
        const account = await tx.account.findFirst({
          where: { id: line.accountId, tenantId },
        });
        if (!account) {
          throw new BadRequestException(`Account ${line.accountId} not found`);
        }
        if (account.isGroup) {
          throw new BadRequestException('Journal lines cannot be posted to group accounts');
        }

        const currentBalance = new Decimal(account.balance);
        const newBalance = currentBalance.plus(line.debit).minus(line.credit);

        await tx.account.update({
          where: { id: line.accountId },
          data: { balance: newBalance },
        });
      }

      await tx.journalEntry.update({
        where: { id: journalEntryId },
        data: { status: 'POSTED' },
      });

      return tx.journalEntry.findUnique({
        where: { id: journalEntryId },
        include: { lines: { include: { account: true } } },
      });
    });
  }

  async cancel(tenantId: string, journalEntryId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: journalEntryId, tenantId },
      include: { lines: true },
    });

    if (!entry) {
      throw new BadRequestException('Journal entry not found');
    }
    if (entry.status !== 'POSTED') {
      throw new BadRequestException('Only posted entries can be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of entry.lines) {
        const account = await tx.account.findFirst({
          where: { id: line.accountId, tenantId },
        });
        if (!account) continue;

        const currentBalance = new Decimal(account.balance);
        const newBalance = currentBalance.minus(line.debit).plus(line.credit);

        await tx.account.update({
          where: { id: line.accountId },
          data: { balance: newBalance },
        });
      }

      await tx.journalEntry.update({
        where: { id: journalEntryId },
        data: { status: 'CANCELLED' },
      });

      return tx.journalEntry.findUnique({
        where: { id: journalEntryId },
        include: { lines: { include: { account: true } } },
      });
    });
  }

  async list(tenantId: string, from?: string, to?: string, status?: JournalStatus) {
    const where: { tenantId: string; date?: { gte?: Date; lte?: Date }; status?: JournalStatus } = {
      tenantId,
    };
    if (from) where.date = { ...where.date, gte: new Date(from) };
    if (to) where.date = { ...where.date, lte: new Date(to) };
    if (status) where.status = status;

    return this.prisma.journalEntry.findMany({
      where,
      include: { lines: { include: { account: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async get(tenantId: string, id: string) {
    return this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: { lines: { include: { account: true } } },
    });
  }
}
