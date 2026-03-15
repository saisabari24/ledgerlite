import { PrismaClient, UserRole } from '@prisma/client';
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
