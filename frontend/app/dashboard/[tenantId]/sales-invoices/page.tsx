'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

type SalesInvoice = {
  id: string;
  number: string;
  date: string;
  customer: string;
  amount: number;
  status: 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
};

export default function SalesInvoicesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const invoices = useMemo<SalesInvoice[]>(
    () => [
      {
        id: 'INV-0001',
        number: 'INV-0001',
        date: '2026-04-02',
        customer: 'Sample Customer',
        amount: 29500,
        status: 'UNPAID',
      },
      {
        id: 'INV-0002',
        number: 'INV-0002',
        date: '2026-04-05',
        customer: 'Another Customer',
        amount: 18000,
        status: 'PAID',
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
          <h1 className="text-xl font-semibold">Sales Invoices</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Customer invoices and their payment status. Fully client-side for now; backend hooks can be added later.
          </p>
        </div>
        <button className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90">
          New Invoice
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Invoice #</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2">{inv.number}</td>
                <td className="px-4 py-2">{inv.date}</td>
                <td className="px-4 py-2">{inv.customer}</td>
                <td className="px-4 py-2 text-right">{formatAmount(inv.amount)}</td>
                <td className="px-4 py-2">
                  <span
                    className="rounded px-2 py-0.5 text-xs"
                    data-tenant-id={tenantId}
                  >
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

