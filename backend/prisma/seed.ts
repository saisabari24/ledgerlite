import { PrismaClient, UserRole, PrintTemplateType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_ACCOUNTS = [
  { code: '1000', name: 'Cash', type: 'ASSET' as const },
  { code: '1100', name: 'Bank', type: 'ASSET' as const },
  { code: '1200', name: 'Accounts Receivable', type: 'ASSET' as const },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' as const },
  { code: '2100', name: 'GST Payable', type: 'LIABILITY' as const },
  { code: '3000', name: "Owner's Equity", type: 'EQUITY' as const },
  { code: '4000', name: 'Sales Revenue', type: 'INCOME' as const },
  { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' as const },
  { code: '5100', name: 'Operating Expenses', type: 'EXPENSE' as const },
];

async function main() {
  const hash = await bcrypt.hash('password123', 10);

  // 2 CAs
  const ca1 = await prisma.user.upsert({
    where: { email: 'ca1@example.com' },
    create: {
      email: 'ca1@example.com',
      passwordHash: hash,
      role: UserRole.CA,
    },
    update: {},
  });

  const ca2 = await prisma.user.upsert({
    where: { email: 'ca2@example.com' },
    create: {
      email: 'ca2@example.com',
      passwordHash: hash,
      role: UserRole.CA,
    },
    update: {},
  });

  const cas = [ca1, ca2];

  // 3 Businesses (tenants + business users)
  const businesses = [
    { name: 'ABC Pvt Ltd', gstin: '29AABCU9603R1ZM', email: 'business1@example.com' },
    { name: 'TechNova LLP', gstin: '27AABCT1234N1Z5', email: 'business2@example.com' },
    { name: 'Zenith Industries', gstin: '33AAACZ5678P1Z9', email: 'business3@example.com' },
  ];

  const tenants: { id: string; name: string }[] = [];

  for (let i = 0; i < businesses.length; i++) {
    const b = businesses[i];
    const tenantId = `seed-tenant-${i + 1}`;

    const tenant = await prisma.tenant.upsert({
      where: { id: tenantId },
      create: {
        id: tenantId,
        name: b.name,
        gstin: b.gstin,
        currency: 'INR',
      },
      update: {},
    });
    tenants.push({ id: tenant.id, name: tenant.name });

    await prisma.user.upsert({
      where: { email: b.email },
      create: {
        email: b.email,
        passwordHash: hash,
        role: UserRole.BUSINESS,
        tenantId: tenant.id,
      },
      update: { tenantId: tenant.id },
    });

    // Grant both CAs access to this business
    for (const ca of cas) {
      await prisma.caAccess.upsert({
        where: {
          caUserId_tenantId: { caUserId: ca.id, tenantId: tenant.id },
        },
        create: {
          caUserId: ca.id,
          tenantId: tenant.id,
          permissionLevel: 'EDIT',
        },
        update: {},
      });
    }

    // Seed default accounts for each tenant
    for (const acc of DEFAULT_ACCOUNTS) {
      await prisma.account.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: acc.code } },
        create: { tenantId: tenant.id, ...acc },
        update: {},
      });
    }

    // Seed builtin print templates for each tenant
    const baseBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>{{doc.title}}</title>
  </head>
  <body class="p-8 text-sm text-slate-900">
    <header class="mb-6 flex items-start justify-between border-b pb-4">
      <div>
        <h1 class="text-xl font-semibold">{{company.name}}</h1>
        <p class="mt-1">{{company.address}}</p>
        <p class="mt-1">GSTIN: {{company.gstin}}</p>
      </div>
      <div class="text-right">
        <p class="text-xs uppercase tracking-wide text-slate-500">{{doc.type_label}}</p>
        <p class="mt-1 font-medium">No: {{doc.number}}</p>
        <p class="mt-1">Date: {{doc.date}}</p>
      </div>
    </header>

    <section class="mb-6">
      <p class="font-medium">Bill To:</p>
      <p class="mt-1">{{party.name}}</p>
      <p class="mt-1">{{party.address}}</p>
      <p class="mt-1">GSTIN: {{party.gstin}}</p>
    </section>

    <table class="mb-4 w-full border-collapse text-xs">
      <thead>
        <tr class="border-b bg-slate-50">
          <th class="px-2 py-1 text-left">#</th>
          <th class="px-2 py-1 text-left">Item</th>
          <th class="px-2 py-1 text-right">Qty</th>
          <th class="px-2 py-1 text-right">Rate</th>
          <th class="px-2 py-1 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{#each lines}}
        <tr class="border-b">
          <td class="px-2 py-1">{{index}}</td>
          <td class="px-2 py-1">{{line.description}}</td>
          <td class="px-2 py-1 text-right">{{line.qty}}</td>
          <td class="px-2 py-1 text-right">{{line.rate}}</td>
          <td class="px-2 py-1 text-right">{{line.amount}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <section class="flex justify-end">
      <div class="w-64 text-xs">
        <div class="flex justify-between">
          <span>Subtotal</span>
          <span>{{totals.subtotal}}</span>
        </div>
        <div class="flex justify-between">
          <span>Tax</span>
          <span>{{totals.tax}}</span>
        </div>
        <div class="mt-2 flex justify-between border-t pt-2 font-medium">
          <span>Total</span>
          <span>{{totals.total}}</span>
        </div>
      </div>
    </section>

    <section class="mt-6 text-xs text-slate-600">
      <p class="font-medium">Terms &amp; Conditions</p>
      <p class="mt-1 whitespace-pre-line">{{doc.terms}}</p>
    </section>
  </body>
</html>
`.trim();

    const templates = [
      {
        name: 'Minimal – Sales Invoice',
        type: PrintTemplateType.SALES_INVOICE,
      },
      {
        name: 'Minimal – Purchase Invoice',
        type: PrintTemplateType.PURCHASE_INVOICE,
      },
      {
        name: 'Minimal – Quote',
        type: PrintTemplateType.QUOTE,
      },
      {
        name: 'Minimal – Payment',
        type: PrintTemplateType.PAYMENT,
      },
    ];

    for (const tpl of templates) {
      await prisma.printTemplate.upsert({
        where: {
          tenantId_name: { tenantId: tenant.id, name: tpl.name },
        },
        create: {
          tenantId: tenant.id,
          name: tpl.name,
          type: tpl.type,
          isDefault: true,
          isCustom: false,
          engine: 'HTML',
          body: baseBody,
        },
        update: {},
      });
    }
  }

  console.log('Seed complete:');
  console.log('\nCAs (password: password123):');
  console.log('  - ca1@example.com');
  console.log('  - ca2@example.com');
  console.log('\nBusinesses (password: password123):');
  console.log('  - business1@example.com -> ABC Pvt Ltd');
  console.log('  - business2@example.com -> TechNova LLP');
  console.log('  - business3@example.com -> Zenith Industries');
  console.log('\nBoth CAs have access to all 3 businesses.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
