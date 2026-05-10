'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

type Quote = {
  id: string;
  number: string;
  date: string;
  customer: string;
  amount: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED';
};

export default function SalesQuotesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const quotes = useMemo<Quote[]>(
    () => [
      {
        id: 'Q-0001',
        number: 'Q-0001',
        date: '2026-04-01',
        customer: 'Sample Customer',
        amount: 25000,
        status: 'SENT',
      },
      {
        id: 'Q-0002',
        number: 'Q-0002',
        date: '2026-04-03',
        customer: 'Another Customer',
        amount: 18000,
        status: 'DRAFT',
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
          <h1 className="text-xl font-semibold">Sales Quotes</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Quotes raised for customers. This screen is wired for UI only; backend integration can be added next.
          </p>
        </div>
        <button className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90">
          New Quote
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Quote #</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2">{q.number}</td>
                <td className="px-4 py-2">{q.date}</td>
                <td className="px-4 py-2">{q.customer}</td>
                <td className="px-4 py-2 text-right">{formatAmount(q.amount)}</td>
                <td className="px-4 py-2">
                  <span
                    className="rounded px-2 py-0.5 text-xs"
                    data-tenant-id={tenantId}
                  >
                    {q.status}
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

