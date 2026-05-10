'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

type SalesPayment = {
  id: string;
  date: string;
  customer: string;
  mode: string;
  reference: string;
  amount: number;
  allocatedTo: string;
};

export default function SalesPaymentsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const payments = useMemo<SalesPayment[]>(
    () => [
      {
        id: 'RCPT-0001',
        date: '2026-04-04',
        customer: 'Sample Customer',
        mode: 'Bank Transfer',
        reference: 'UTR123456',
        amount: 20000,
        allocatedTo: 'INV-0001',
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
          <h1 className="text-xl font-semibold">Sales Payments</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Receipts from customers against sales invoices. Data is static for now and ready to be wired to APIs.
          </p>
        </div>
        <button className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90">
          New Payment
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-left">Mode</th>
              <th className="px-4 py-2 text-left">Reference</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Allocated To</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2">{p.date}</td>
                <td className="px-4 py-2">{p.customer}</td>
                <td className="px-4 py-2">{p.mode}</td>
                <td className="px-4 py-2">{p.reference}</td>
                <td className="px-4 py-2 text-right">{formatAmount(p.amount)}</td>
                <td className="px-4 py-2" data-tenant-id={tenantId}>
                  {p.allocatedTo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

