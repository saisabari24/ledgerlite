import { PrismaClient, UserRole, PrintTemplateType, SalesQuoteStatus, SalesInvoiceStatus, PurchaseInvoiceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);

  // Demo tenant
  let tenant = await prisma.tenant.findFirst({ where: { name: 'ABC Pvt Ltd' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: 'demo-tenant',
        name: 'ABC Pvt Ltd',
        gstin: '29AABCU9603R1ZM',
        currency: 'INR',
        address: '123 MG Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        phone: '+91 98765 43210',
        tenantEmail: 'hello@abc.in',
        termsAndConditions: 'Payment due within 15 days.\nGoods once sold cannot be returned.\nAll disputes subject to Bengaluru jurisdiction.',
        bankName: 'State Bank of India',
        bankAccountName: 'ABC Pvt Ltd',
        bankAccountNumber: '1234567890123456',
        bankIfsc: 'SBIN0001234',
      },
    });
  }

  // Ensure demo CA user exists
  const caUser = await prisma.user.upsert({
    where: { email: 'ca1@example.com' },
    update: {},
    create: {
      email: 'ca1@example.com',
      passwordHash: hash,
      role: UserRole.CA,
    },
  });

  // Add sample journals
  const leafAccounts = await prisma.account.findMany({
    where: { tenantId: tenant.id, isGroup: false },
  });

  if (leafAccounts.length >= 2) {
    const cashAcc = leafAccounts.find((a) => a.name.toLowerCase().includes('cash'));
    const bankAcc = leafAccounts.find((a) => a.name.toLowerCase().includes('bank'));
    const salesAcc = leafAccounts.find((a) => a.name.toLowerCase().includes('sales'));
    const expenseAcc = leafAccounts.find((a) => a.name.toLowerCase().includes('expense') || a.name.toLowerCase().includes('rent'));
    const arAcc = leafAccounts.find((a) => a.name.toLowerCase().includes('receivable'));

    const acc1 = cashAcc || leafAccounts[0];
    const acc2 = bankAcc || leafAccounts[1];
    const acc3 = salesAcc || leafAccounts[2];

    // Journal Entry 1 - Salary
    const salaryAcc = expenseAcc || leafAccounts[Math.min(3, leafAccounts.length - 1)];
    const je1 = await prisma.journalEntry.create({
      data: {
        tenantId: tenant.id,
        date: new Date('2026-04-01'),
        description: 'April Salary Payment',
        status: 'POSTED',
        lines: {
          create: [
            { accountId: acc1.id, debit: 0, credit: 75000 },
            { accountId: acc2.id, debit: 75000, credit: 0 },
          ],
        },
      },
    });

    // Journal Entry 2 - Sales
    if (arAcc && salesAcc) {
      await prisma.journalEntry.create({
        data: {
          tenantId: tenant.id,
          date: new Date('2026-04-05'),
          description: 'Sales to Acme Corp',
          status: 'POSTED',
          lines: {
            create: [
              { accountId: arAcc.id, debit: 118000, credit: 0 },
              { accountId: salesAcc.id, debit: 0, credit: 118000 },
            ],
          },
        },
      });
    }

    // Journal Entry 3 - Rent
    const rentAcc = expenseAcc || leafAccounts[Math.min(4, leafAccounts.length - 1)];
    await prisma.journalEntry.create({
      data: {
        tenantId: tenant.id,
        date: new Date('2026-04-10'),
        description: 'Office Rent - April',
        status: 'POSTED',
        lines: {
          create: [
            { accountId: rentAcc.id, debit: 45000, credit: 0 },
            { accountId: acc1.id, debit: 0, credit: 45000 },
          ],
        },
      },
    });
  }

  // Add sample customers
  const cust1 = await prisma.customer.upsert({
    where: { id: 'seed-cust-demo-1' },
    update: {},
    create: {
      id: 'seed-cust-demo-1',
      tenantId: tenant.id,
      name: 'Acme Corp',
      email: 'billing@acme.com',
      phone: '+91 98765 43210',
      gstin: '29AABCA1234F1Z5',
      address: '456 Industrial Zone, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400069',
    },
  });

  const cust2 = await prisma.customer.upsert({
    where: { id: 'seed-cust-demo-2' },
    update: {},
    create: {
      id: 'seed-cust-demo-2',
      tenantId: tenant.id,
      name: 'Beta Enterprises',
      email: 'info@beta.in',
      phone: '+91 87654 32109',
      gstin: '27AABCB5678K2Z6',
      address: '789 Tech Park, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560066',
    },
  });

  // Add sample suppliers
  const supp1 = await prisma.supplier.upsert({
    where: { id: 'seed-supp-demo-1' },
    update: {},
    create: {
      id: 'seed-supp-demo-1',
      tenantId: tenant.id,
      name: 'Global Supplies Co.',
      email: 'orders@globalsupplies.com',
      phone: '+91 76543 21098',
      gstin: '33AABCS9012M3Z7',
      address: '321 Trade Centre, Connaught Place',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
  });

  // Sample items
  const items = await prisma.item.findMany({ where: { tenantId: tenant.id }, take: 3 });
  if (items.length === 0) {
    // Create items if none exist
    const it1 = await prisma.item.create({ data: { tenantId: tenant.id, code: 'WIDGET-A', name: 'Widget A', unit: 'nos', rate: 150.00, taxRate: 18 } });
    const it2 = await prisma.item.create({ data: { tenantId: tenant.id, code: 'WIDGET-B', name: 'Widget B', unit: 'nos', rate: 250.00, taxRate: 18 } });
    const it3 = await prisma.item.create({ data: { tenantId: tenant.id, code: 'CONSULT', name: 'Consulting Services', unit: 'Hour', rate: 2000.00, taxRate: 18 } });
    const it4 = await prisma.item.create({ data: { tenantId: tenant.id, code: 'STEEL12MM', name: 'Steel Rod 12mm', unit: 'kg', rate: 85.50, taxRate: 12 } });
    items.push(it1, it2, it3, it4);
  }

  // Sample Sales Quote
  if (items.length >= 2) {
    await prisma.salesQuote.create({
      data: {
        tenantId: tenant.id,
        quoteNo: 'Q-0001',
        date: new Date('2026-04-15'),
        customerId: cust1.id,
        status: SalesQuoteStatus.SENT,
        subtotal: 4000,
        tax: 720,
        total: 4720,
        description: 'Website redesign project',
        lines: {
          create: [
            { itemId: items[0].id, description: 'Design consultation', quantity: 2, rate: 150.00, taxRate: 18, amount: 300.00 },
            { itemId: items[1].id, description: 'Frontend development', quantity: 1, rate: 250.00, taxRate: 18, amount: 250.00 },
          ],
        },
      },
    });
  }

  // Sample Sales Invoice (DRAFT)
  const accountLeaf = await prisma.account.findFirst({ where: { tenantId: tenant.id, isGroup: false } });
  if (items.length >= 2 && accountLeaf) {
    const inv1 = await prisma.salesInvoice.create({
      data: {
        tenantId: tenant.id,
        invoiceNo: 'INV-0001',
        date: new Date('2026-04-20'),
        dueDate: new Date('2026-05-05'),
        customerId: cust1.id,
        status: SalesInvoiceStatus.DRAFT,
        subtotal: 4000,
        tax: 720,
        total: 4720,
        description: 'Monthly consulting retainer - April',
        terms: 'Net 15. Late payment penalty of 2% per month.',
        lines: {
          create: [
            { itemId: items[0].id, accountId: accountLeaf.id, description: 'Strategy consulting', quantity: 10, rate: 150, taxRate: 18, amount: 1500 },
            { itemId: items[1].id, accountId: accountLeaf.id, description: 'Technical consulting', quantity: 10, rate: 250, taxRate: 18, amount: 2500 },
          ],
        },
      },
    });

    // Sample Sales Invoice (UNPAID - already posted)
    const inv2 = await prisma.salesInvoice.create({
      data: {
        tenantId: tenant.id,
        invoiceNo: 'INV-0002',
        date: new Date('2026-04-01'),
        dueDate: new Date('2026-04-30'),
        customerId: cust2.id,
        status: SalesInvoiceStatus.DRAFT,
        subtotal: 15000,
        tax: 2700,
        total: 17700,
        description: 'Software implementation - Phase 1',
        terms: 'Net 30. Payment via NEFT preferred.',
        lines: {
          create: [
            { itemId: items[2].id, accountId: accountLeaf.id, description: 'Implementation services', quantity: 5, rate: 2000, taxRate: 18, amount: 10000 },
            { itemId: items[0].id, accountId: accountLeaf.id, description: 'Training materials', quantity: 20, rate: 250, taxRate: 18, amount: 5000 },
          ],
        },
      },
    });

    // Sample Purchase Invoice (DRAFT)
    await prisma.purchaseInvoice.create({
      data: {
        tenantId: tenant.id,
        invoiceNo: 'PINV-0001',
        date: new Date('2026-04-18'),
        supplierId: supp1.id,
        status: PurchaseInvoiceStatus.DRAFT,
        subtotal: 10000,
        tax: 1800,
        total: 11800,
        description: 'Office supplies and equipment',
        lines: {
          create: [
            { itemId: items[3].id, accountId: accountLeaf.id, description: 'Steel rods - 100kg', quantity: 100, rate: 85.50, taxRate: 12, amount: 8550 },
            { itemId: items[0].id, accountId: accountLeaf.id, description: 'Packaging materials', quantity: 10, rate: 145, taxRate: 18, amount: 1450 },
          ],
        },
      },
    });
  }

  // Sample Stock Movement (DRAFT)
  if (items.length >= 2 && accountLeaf) {
    const accountLeaf2 = await prisma.account.findFirst({
      where: { tenantId: tenant.id, isGroup: false, id: { not: accountLeaf.id } },
    });
    if (accountLeaf2) {
      await prisma.stockMovement.create({
        data: {
          tenantId: tenant.id,
          movementNo: 'SM-0001',
          date: new Date('2026-04-22'),
          movementType: 'TRANSFER',
          status: 'DRAFT',
          description: 'Warehouse to Store transfer - Monthly stock replenishment',
          lines: {
            create: [
              { itemId: items[0].id, quantity: 50, fromAccountId: accountLeaf.id, toAccountId: accountLeaf2.id },
              { itemId: items[1].id, quantity: 30, fromAccountId: accountLeaf.id, toAccountId: accountLeaf2.id },
            ],
          },
        },
      });
    }
  }

  console.log('Demo seed complete! Use ca1@example.com / password123 or business1@example.com / password123');
  console.log('  - 3 journal entries POSTED');
  console.log('  - 2 customers, 1 supplier');
  console.log('  - 1 sales quote, 2 sales invoices, 1 purchase invoice');
  console.log('  - 1 stock movement');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
