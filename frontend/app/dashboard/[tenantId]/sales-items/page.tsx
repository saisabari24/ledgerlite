'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

type SalesItem = {
  id: string;
  code: string;
  name: string;
  unit: string;
  rate: number;
  taxRate: number;
};

export default function SalesItemsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const items = useMemo<SalesItem[]>(
    () => [
      {
        id: 'ITEM-0001',
        code: 'CONSULT',
        name: 'Consulting Services',
        unit: 'Hour',
        rate: 1500,
        taxRate: 18,
      },
      {
        id: 'ITEM-0002',
        code: 'IMPL',
        name: 'Implementation Support',
        unit: 'Hour',
        rate: 2000,
        taxRate: 18,
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
          <h1 className="text-xl font-semibold">Sales Items</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Products and services used in sales transactions. Static catalog for now, structured for future CRUD.
          </p>
        </div>
        <button className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90">
          New Item
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Unit</th>
              <th className="px-4 py-2 text-right">Rate</th>
              <th className="px-4 py-2 text-right">Tax %</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2">{i.code}</td>
                <td className="px-4 py-2">{i.name}</td>
                <td className="px-4 py-2">{i.unit}</td>
                <td className="px-4 py-2 text-right">{formatAmount(i.rate)}</td>
                <td className="px-4 py-2 text-right" data-tenant-id={tenantId}>
                  {i.taxRate.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

