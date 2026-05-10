'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

type PurchaseInvoice = {
  id: string;
  number: string;
  date: string;
  supplier: string;
  amount: number;
  status: 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
};

export default function PurchaseInvoicesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const invoices = useMemo<PurchaseInvoice[]>(
    () => [
      {
        id: 'PINV-0001',
        number: 'PINV-0001',
        date: '2026-04-03',
        supplier: 'Sample Supplier',
        amount: 12000,
        status: 'UNPAID',
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
          <h1 className="text-xl font-semibold">Purchase Invoices</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Bills received from suppliers. This view is UI-only and can be wired to real data later.
          </p>
        </div>
        <button className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90">
          New Purchase Invoice
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Invoice #</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Supplier</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2">{inv.number}</td>
                <td className="px-4 py-2">{inv.date}</td>
                <td className="px-4 py-2">{inv.supplier}</td>
                <td className="px-4 py-2 text-right">{formatAmount(inv.amount)}</td>
                <td className="px-4 py-2" data-tenant-id={tenantId}>
                  {inv.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

