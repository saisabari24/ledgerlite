'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

type PurchasePayment = {
  id: string;
  date: string;
  supplier: string;
  mode: string;
  reference: string;
  amount: number;
  against: string;
};

export default function PurchasePaymentsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const payments = useMemo<PurchasePayment[]>(
    () => [
      {
        id: 'PAY-0001',
        date: '2026-04-06',
        supplier: 'Sample Supplier',
        mode: 'Bank Transfer',
        reference: 'UTR987654',
        amount: 12000,
        against: 'PINV-0001',
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
          <h1 className="text-xl font-semibold">Purchase Payments</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Payments made to suppliers. Static data to mirror the final UX.
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
              <th className="px-4 py-2 text-left">Supplier</th>
              <th className="px-4 py-2 text-left">Mode</th>
              <th className="px-4 py-2 text-left">Reference</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Against</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2">{p.date}</td>
                <td className="px-4 py-2">{p.supplier}</td>
                <td className="px-4 py-2">{p.mode}</td>
                <td className="px-4 py-2">{p.reference}</td>
                <td className="px-4 py-2 text-right">{formatAmount(p.amount)}</td>
                <td className="px-4 py-2" data-tenant-id={tenantId}>
                  {p.against}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

