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

    // Seed default inventory items for each tenant
    const DEFAULT_ITEMS = [
      { code: 'ITM001', name: 'Widget A', unit: 'nos', rate: 150.00 },
      { code: 'ITM002', name: 'Widget B', unit: 'nos', rate: 250.00 },
      { code: 'ITM003', name: 'Steel Rod 12mm', unit: 'kg', rate: 85.50 },
      { code: 'ITM004', name: 'Copper Wire', unit: 'meter', rate: 45.00 },
      { code: 'ITM005', name: 'Packaging Box', unit: 'nos', rate: 12.00 },
    ];
    for (const it of DEFAULT_ITEMS) {
      await prisma.item.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: it.code } },
        create: { tenantId: tenant.id, ...it },
        update: {},
      });
    }

    // Seed builtin print templates for each tenant
    const minimalBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>{{doc.title}}</title></head>
<body style="margin:0;padding:32px 40px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#1e293b;line-height:1.5;">
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding-bottom:20px;">
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#0f172a;">{{settings.name}}</h1>
        <p style="margin:4px 0 0;color:#64748b;white-space:pre-line;">{{settings.address}}</p>
        <p style="margin:2px 0 0;color:#64748b;">GSTIN: {{settings.gstin}} | PAN: {{settings.pan}}</p>
        <p style="margin:2px 0 0;color:#64748b;">{{settings.phone}} | {{settings.email}}</p>
      </td>
      <td style="padding-bottom:20px;text-align:right;vertical-align:top;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">{{doc.type_label}}</p>
        <p style="margin:4px 0 0;font-weight:600;font-size:15px;">#{{doc.number}}</p>
        <p style="margin:2px 0 0;color:#64748b;">Date: {{doc.date}}</p>
      </td>
    </tr>
  </table>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;" />
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <tr>
      <td style="vertical-align:top;width:50%;">
        <p style="margin:0;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;">Bill To</p>
        <p style="margin:4px 0 0;font-weight:600;">{{party.name}}</p>
        <p style="margin:2px 0 0;color:#475569;">{{party.address}}</p>
        <p style="margin:2px 0 0;color:#475569;">GSTIN: {{party.gstin}}</p>
      </td>
      <td style="vertical-align:top;width:50%;text-align:right;">
        <img src="{{settings.logoUrl}}" style="max-height:60px;max-width:160px;" />
      </td>
    </tr>
  </table>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead>
      <tr style="border-bottom:2px solid #e2e8f0;">
        <th style="padding:8px 6px;text-align:left;font-weight:600;color:#475569;">#</th>
        <th style="padding:8px 6px;text-align:left;font-weight:600;color:#475569;">Item</th>
        <th style="padding:8px 6px;text-align:right;font-weight:600;color:#475569;">Qty</th>
        <th style="padding:8px 6px;text-align:right;font-weight:600;color:#475569;">Rate</th>
        <th style="padding:8px 6px;text-align:right;font-weight:600;color:#475569;">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each lines}}
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 6px;color:#64748b;">{{index}}</td>
        <td style="padding:8px 6px;">{{line.description}}</td>
        <td style="padding:8px 6px;text-align:right;">{{line.qty}}</td>
        <td style="padding:8px 6px;text-align:right;">{{line.rate}}</td>
        <td style="padding:8px 6px;text-align:right;font-weight:500;">{{line.amount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  <table style="width:100%;margin-top:16px;">
    <tr>
      <td style="text-align:right;width:70%;padding:4px 6px;font-size:12px;color:#64748b;">Subtotal</td>
      <td style="text-align:right;width:30%;padding:4px 6px;font-size:12px;font-weight:500;">{{totals.subtotal}}</td>
    </tr>
    <tr>
      <td style="text-align:right;padding:4px 6px;font-size:12px;color:#64748b;">Tax</td>
      <td style="text-align:right;padding:4px 6px;font-size:12px;font-weight:500;">{{totals.tax}}</td>
    </tr>
    <tr>
      <td style="text-align:right;padding:6px;font-size:14px;font-weight:700;border-top:2px solid #1e293b;">Total</td>
      <td style="text-align:right;padding:6px;font-size:14px;font-weight:700;border-top:2px solid #1e293b;">{{totals.total}}</td>
    </tr>
  </table>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;" />
  <p style="margin:0;font-weight:600;font-size:12px;color:#64748b;">Terms &amp; Conditions</p>
  <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;white-space:pre-line;">{{settings.terms}}</p>
</body>
</html>`.trim();

    const professionalBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>{{doc.title}}</title></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#1e293b;line-height:1.5;">
  <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:32px 40px;color:#fff;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="vertical-align:middle;">
          <img src="{{settings.logoUrl}}" style="max-height:50px;max-width:140px;margin-bottom:8px;" />
          <h1 style="margin:0;font-size:22px;font-weight:700;">{{settings.name}}</h1>
          <p style="margin:4px 0 0;color:#cbd5e1;white-space:pre-line;">{{settings.address}}</p>
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;">{{doc.type_label}}</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;">#{{doc.number}}</p>
          <p style="margin:2px 0 0;color:#cbd5e1;">Date: {{doc.date}}</p>
        </td>
      </tr>
    </table>
  </div>
  <div style="padding:24px 40px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="vertical-align:top;width:50%;background:#f8fafc;padding:16px;border-radius:8px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;">Bill To</p>
          <p style="margin:6px 0 0;font-weight:600;font-size:14px;">{{party.name}}</p>
          <p style="margin:2px 0 0;color:#475569;">{{party.address}}</p>
          <p style="margin:2px 0 0;color:#475569;">GSTIN: {{party.gstin}}</p>
        </td>
        <td style="width:16px;"></td>
        <td style="vertical-align:top;width:50%;background:#f8fafc;padding:16px;border-radius:8px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;">Company Info</p>
          <p style="margin:6px 0 0;color:#475569;">GSTIN: {{settings.gstin}}</p>
          <p style="margin:2px 0;color:#475569;">PAN: {{settings.pan}}</p>
          <p style="margin:2px 0;color:#475569;">{{settings.phone}}</p>
          <p style="margin:2px 0 0;color:#475569;">{{settings.email}}</p>
        </td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#1e293b;color:#fff;">
          <th style="padding:10px 8px;text-align:left;font-weight:500;">#</th>
          <th style="padding:10px 8px;text-align:left;font-weight:500;">Item</th>
          <th style="padding:10px 8px;text-align:right;font-weight:500;">Qty</th>
          <th style="padding:10px 8px;text-align:right;font-weight:500;">Rate</th>
          <th style="padding:10px 8px;text-align:right;font-weight:500;">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{#each lines}}
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 8px;color:#64748b;">{{index}}</td>
          <td style="padding:10px 8px;">{{line.description}}</td>
          <td style="padding:10px 8px;text-align:right;">{{line.qty}}</td>
          <td style="padding:10px 8px;text-align:right;">{{line.rate}}</td>
          <td style="padding:10px 8px;text-align:right;font-weight:600;">{{line.amount}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    <div style="margin-top:16px;margin-left:auto;width:280px;background:#f8fafc;border-radius:8px;padding:16px;">
      <table style="width:100%;font-size:13px;">
        <tr>
          <td style="padding:4px 0;color:#64748b;">Subtotal</td>
          <td style="padding:4px 0;text-align:right;font-weight:500;">{{totals.subtotal}}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b;">Tax</td>
          <td style="padding:4px 0;text-align:right;font-weight:500;">{{totals.tax}}</td>
        </tr>
        <tr>
          <td style="padding:8px 0 0;font-weight:700;font-size:15px;border-top:2px solid #1e293b;">Total</td>
          <td style="padding:8px 0 0;text-align:right;font-weight:700;font-size:15px;border-top:2px solid #1e293b;">{{totals.total}}</td>
        </tr>
      </table>
    </div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;" />
    <table style="width:100%;font-size:12px;">
      <tr>
        <td style="vertical-align:top;width:50%;padding-right:16px;">
          <p style="margin:0;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-size:11px;">Bank Details</p>
          <p style="margin:4px 0 0;color:#475569;">{{settings.bankAccountName}}</p>
          <p style="margin:2px 0;color:#475569;">A/C: {{settings.bankAccountNumber}}</p>
          <p style="margin:2px 0;color:#475569;">IFSC: {{settings.bankIfsc}}</p>
          <p style="margin:2px 0 0;color:#475569;">{{settings.bankName}}</p>
        </td>
        <td style="vertical-align:top;width:50%;padding-left:16px;">
          <p style="margin:0;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-size:11px;">Terms &amp; Conditions</p>
          <p style="margin:4px 0 0;color:#94a3b8;white-space:pre-line;">{{settings.terms}}</p>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
    <p style="margin:0;text-align:center;font-size:11px;color:#94a3b8;">This is a computer-generated document and does not require a physical signature.</p>
  </div>
</body>
</html>`.trim();

    const templateDefs = [
      { style: 'Minimal', type: PrintTemplateType.SALES_INVOICE, default: true },
      { style: 'Minimal', type: PrintTemplateType.PURCHASE_INVOICE, default: true },
      { style: 'Minimal', type: PrintTemplateType.QUOTE, default: true },
      { style: 'Minimal', type: PrintTemplateType.PAYMENT, default: true },
      { style: 'Professional', type: PrintTemplateType.SALES_INVOICE, default: false },
      { style: 'Professional', type: PrintTemplateType.PURCHASE_INVOICE, default: false },
      { style: 'Professional', type: PrintTemplateType.QUOTE, default: false },
      { style: 'Professional', type: PrintTemplateType.PAYMENT, default: false },
    ];

    for (const tpl of templateDefs) {
      const body = tpl.style === 'Professional' ? professionalBody : minimalBody;
      const typeLabels: Record<string, string> = {
        SALES_INVOICE: 'Sales Invoice',
        PURCHASE_INVOICE: 'Purchase Invoice',
        QUOTE: 'Quote',
        PAYMENT: 'Payment',
      };
      const name = `${tpl.style} \u2013 ${typeLabels[tpl.type]}`;
      await prisma.printTemplate.upsert({
        where: {
          tenantId_name: { tenantId: tenant.id, name },
        },
        create: {
          tenantId: tenant.id,
          name,
          type: tpl.type,
          isDefault: tpl.default,
          isCustom: false,
          engine: 'HTML',
          body,
        },
        update: {},
      });
    }

    // Seed sample customers for each tenant
    const sampleCustomers = [
      { name: 'Acme Corp', email: 'billing@acme.com', phone: '+91 98765 43210', gstin: '29AABCA1234F1Z5', address: '456 Industrial Zone', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      { name: 'Beta Enterprises', email: 'info@beta.in', phone: '+91 87654 32109', gstin: '27AABCB5678K2Z6', address: '789 Tech Park', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    ];
    for (const c of sampleCustomers) {
      await prisma.customer.upsert({
        where: { id: `seed-cust-${tenant.id}-${c.email}` },
        create: { id: `seed-cust-${tenant.id}-${c.email}`, tenantId: tenant.id, ...c },
        update: {},
      });
    }

    // Seed sample suppliers for each tenant
    const sampleSuppliers = [
      { name: 'Global Supplies Co.', email: 'orders@globalsupplies.com', phone: '+91 76543 21098', gstin: '33AABCS9012M3Z7', address: '321 Trade Centre', city: 'Delhi', state: 'Delhi', pincode: '110001' },
      { name: 'Prime Distributors', email: 'info@primedist.in', phone: '+91 65432 10987', gstin: '29AABCP3456N4Z8', address: '555 Commerce Street', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
    ];
    for (const s of sampleSuppliers) {
      await prisma.supplier.upsert({
        where: { id: `seed-supp-${tenant.id}-${s.email}` },
        create: { id: `seed-supp-${tenant.id}-${s.email}`, tenantId: tenant.id, ...s },
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
