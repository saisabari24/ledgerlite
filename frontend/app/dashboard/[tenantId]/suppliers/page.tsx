'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

type Supplier = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  balance: number;
};

export default function SuppliersPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const suppliers = useMemo<Supplier[]>(
    () => [
      {
        id: 'SUP-0001',
        name: 'Sample Supplier',
        email: 'supplier@example.com',
        phone: '+91 91234 56789',
        gstin: '29AABCS1234H1Z9',
        balance: 12000,
      },
    ],
    [],
  );

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Suppliers</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Supplier master data, mirroring the Customers view for purchases.
          </p>
        </div>
        <button className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90">
          New Supplier
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">GSTIN</th>
              <th className="px-4 py-2 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2">{s.email || '-'}</td>
                <td className="px-4 py-2">{s.phone || '-'}</td>
                <td className="px-4 py-2">{s.gstin || '-'}</td>
                <td className="px-4 py-2 text-right" data-tenant-id={tenantId}>
                  {formatAmount(s.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

