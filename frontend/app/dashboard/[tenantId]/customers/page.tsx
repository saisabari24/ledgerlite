'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  balance: number;
};

export default function CustomersPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const customers = useMemo<Customer[]>(
    () => [
      {
        id: 'CUST-0001',
        name: 'Sample Customer',
        email: 'customer@example.com',
        phone: '+91 98765 43210',
        gstin: '29AAACB1234F1Z5',
        balance: 29500,
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
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Master list of customers for this business. This is currently static mock data to shape the UX.
          </p>
        </div>
        <button className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90">
          New Customer
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
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2">{c.email || '-'}</td>
                <td className="px-4 py-2">{c.phone || '-'}</td>
                <td className="px-4 py-2">{c.gstin || '-'}</td>
                <td className="px-4 py-2 text-right" data-tenant-id={tenantId}>
                  {formatAmount(c.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

