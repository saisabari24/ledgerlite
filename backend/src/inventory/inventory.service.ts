import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

function toDecimal(n: number): Decimal {
  return new Decimal(n);
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ ITEMS ============

  async createItem(tenantId: string, dto: { code: string; name: string; unit?: string; rate?: number; description?: string }) {
    const existing = await this.prisma.item.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException(`Item code ${dto.code} already exists`);
    }

    return this.prisma.item.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        unit: dto.unit ?? 'nos',
        rate: toDecimal(dto.rate ?? 0),
        description: dto.description ?? null,
      },
    });
  }

  async listItems(tenantId: string) {
    return this.prisma.item.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });
  }

  async updateItem(tenantId: string, id: string, dto: { code?: string; name?: string; unit?: string; rate?: number; description?: string }) {
    const item = await this.prisma.item.findFirst({ where: { id, tenantId } });
    if (!item) throw new BadRequestException('Item not found');

    if (dto.code !== undefined && dto.code !== item.code) {
      const existing = await this.prisma.item.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });
      if (existing) throw new ConflictException(`Item code ${dto.code} already exists`);
    }

    return this.prisma.item.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.rate !== undefined && { rate: toDecimal(dto.rate) }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async deleteItem(tenantId: string, id: string) {
    const item = await this.prisma.item.findFirst({ where: { id, tenantId } });
    if (!item) throw new BadRequestException('Item not found');

    const lineCount = await this.prisma.stockMovementLine.count({
      where: { itemId: id },
    });
    if (lineCount > 0) {
      throw new BadRequestException(
        `Cannot delete "${item.name}": it is referenced by ${lineCount} stock movement line(s).`,
      );
    }

    await this.prisma.item.delete({ where: { id } });
    return { deleted: true };
  }

  // ============ STOCK MOVEMENTS ============

  async createMovement(
    tenantId: string,
    dto: {
      date: string;
      description?: string;
      movementType?: StockMovementType;
      lines: Array<{ itemId: string; quantity: number; fromAccountId?: string; toAccountId?: string }>;
    },
  ) {
    if (!dto.lines || dto.lines.length < 1) {
      throw new BadRequestException('Stock movement must have at least 1 line');
    }

    const movementNo = await this.nextMovementNo(tenantId);

    return this.prisma.$transaction(async (tx) => {
      const validLines: Array<{ itemId: string; quantity: Decimal; fromAccountId?: string; toAccountId?: string }> = [];

      for (const line of dto.lines) {
        const qty = toDecimal(line.quantity ?? 0);
        if (qty.lte(0)) {
          throw new BadRequestException('Quantity must be greater than 0');
        }

        const item = await tx.item.findFirst({
          where: { id: line.itemId, tenantId },
        });
        if (!item) {
          throw new BadRequestException(`Item ${line.itemId} not found for this tenant`);
        }

        if (line.fromAccountId) {
          const fromAcc = await tx.account.findFirst({
            where: { id: line.fromAccountId, tenantId },
          });
          if (!fromAcc) throw new BadRequestException(`From account ${line.fromAccountId} not found`);
          if (fromAcc.isGroup) throw new BadRequestException('From account must not be a group account');
        }

        if (line.toAccountId) {
          const toAcc = await tx.account.findFirst({
            where: { id: line.toAccountId, tenantId },
          });
          if (!toAcc) throw new BadRequestException(`To account ${line.toAccountId} not found`);
          if (toAcc.isGroup) throw new BadRequestException('To account must not be a group account');
        }

        validLines.push({
          itemId: line.itemId,
          quantity: qty,
          fromAccountId: line.fromAccountId,
          toAccountId: line.toAccountId,
        });
      }

      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          movementNo,
          date: new Date(dto.date),
          description: dto.description ?? null,
          movementType: dto.movementType ?? 'TRANSFER',
          status: 'DRAFT',
        },
      });

      for (const line of validLines) {
        await tx.stockMovementLine.create({
          data: {
            stockMovementId: movement.id,
            itemId: line.itemId,
            quantity: line.quantity,
            fromAccountId: line.fromAccountId ?? null,
            toAccountId: line.toAccountId ?? null,
          },
        });
      }

      return tx.stockMovement.findUnique({
        where: { id: movement.id },
        include: { lines: { include: { item: true, fromAccount: true, toAccount: true } } },
      });
    });
  }

  async postMovement(tenantId: string, movementId: string) {
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.findFirst({
        where: { id: movementId, tenantId },
        include: { lines: { include: { item: true } } },
      });

      if (!movement) throw new BadRequestException('Stock movement not found');
      if (movement.status !== 'DRAFT') {
        throw new BadRequestException(`Cannot post movement with status ${movement.status}`);
      }
      if (movement.lines.length < 1) {
        throw new BadRequestException('Stock movement must have at least 1 line');
      }

      const journalLines: Array<{ accountId: string; debit: Decimal; credit: Decimal }> = [];

      for (const line of movement.lines) {
        const value = toDecimal(Number(line.item.rate)).times(line.quantity);

        if (line.toAccountId) {
          journalLines.push({ accountId: line.toAccountId, debit: value, credit: new Decimal(0) });
        }
        if (line.fromAccountId) {
          journalLines.push({ accountId: line.fromAccountId, debit: new Decimal(0), credit: value });
        }
      }

      const totalDebit = journalLines.reduce((sum, l) => sum.plus(l.debit), new Decimal(0));
      const totalCredit = journalLines.reduce((sum, l) => sum.plus(l.credit), new Decimal(0));

      if (journalLines.length < 2) {
        throw new BadRequestException(
          'Stock movement lines must reference both from and to accounts to generate a balanced journal entry',
        );
      }
      if (!totalDebit.eq(totalCredit)) {
        throw new BadRequestException(
          `Total debit (${totalDebit}) must equal total credit (${totalCredit}). Ensure each line has both from and to accounts.`,
        );
      }

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId,
          date: movement.date,
          description: `Stock Movement ${movement.movementNo}: ${movement.description ?? ''}`,
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

        const account = await tx.account.findFirst({
          where: { id: jl.accountId, tenantId },
        });
        if (account && !account.isGroup) {
          const currentBalance = new Decimal(account.balance);
          const newBalance = currentBalance.plus(jl.debit).minus(jl.credit);
          await tx.account.update({
            where: { id: jl.accountId },
            data: { balance: newBalance },
          });
        }
      }

      await tx.stockMovement.update({
        where: { id: movementId },
        data: { status: 'POSTED', journalEntryId: journalEntry.id },
      });

      return tx.stockMovement.findUnique({
        where: { id: movementId },
        include: { lines: { include: { item: true, fromAccount: true, toAccount: true } }, journalEntry: true },
      });
    });
  }

  async listMovements(tenantId: string) {
    return this.prisma.stockMovement.findMany({
      where: { tenantId },
      include: { lines: { include: { item: true, fromAccount: true, toAccount: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getMovement(tenantId: string, id: string) {
    return this.prisma.stockMovement.findFirst({
      where: { id, tenantId },
      include: { lines: { include: { item: true, fromAccount: true, toAccount: true } } },
    });
  }

  async deleteMovement(tenantId: string, id: string) {
    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!movement) throw new BadRequestException('Stock movement not found');

    if (movement.status === 'POSTED') {
      const journalEntryId = movement.journalEntryId;
      if (!journalEntryId) throw new BadRequestException('Posted movement has no associated journal entry');

      return this.prisma.$transaction(async (tx) => {
        const journalLines = await tx.journalLine.findMany({
          where: { journalEntryId },
        });

        for (const jl of journalLines) {
          const account = await tx.account.findFirst({
            where: { id: jl.accountId, tenantId },
          });
          if (account && !account.isGroup) {
            const currentBalance = new Decimal(account.balance);
            const newBalance = currentBalance.minus(jl.debit).plus(jl.credit);
            await tx.account.update({
              where: { id: jl.accountId },
              data: { balance: newBalance },
            });
          }
        }

        await tx.journalLine.deleteMany({ where: { journalEntryId } });
        await tx.journalEntry.delete({ where: { id: journalEntryId } });
        await tx.stockMovementLine.deleteMany({ where: { stockMovementId: id } });
        await tx.stockMovement.delete({ where: { id } });

        return { deleted: true };
      });
    }

    await this.prisma.stockMovementLine.deleteMany({ where: { stockMovementId: id } });
    await this.prisma.stockMovement.delete({ where: { id } });

    return { deleted: true };
  }

  private async nextMovementNo(tenantId: string): Promise<string> {
    const last = await this.prisma.stockMovement.findFirst({
      where: { tenantId },
      orderBy: { movementNo: 'desc' },
      select: { movementNo: true },
    });

    if (!last) {
      return 'SM-0001';
    }

    const match = last.movementNo.match(/^SM-(\d+)$/);
    if (!match) return 'SM-0001';

    const next = parseInt(match[1], 10) + 1;
    return `SM-${String(next).padStart(4, '0')}`;
  }
}
