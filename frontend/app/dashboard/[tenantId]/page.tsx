'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function isBusinessOwner(tenantId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const u = JSON.parse(localStorage.getItem('user') ?? '{}');
    return u?.role === 'BUSINESS' && u?.tenantId === tenantId;
  } catch {
    return false;
  }
}

type DashboardSummary = {
  assets: number;
  liabilities: number;
  equity: number;
  income: number;
  expenses: number;
  profit: number;
  cashBalance: number;
};

export default function TenantDashboardPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');
  const [showInviteCa, setShowInviteCa] = useState(false);

  useEffect(() => {
    setShowInviteCa(isBusinessOwner(tenantId));
  }, [tenantId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    api<DashboardSummary>(`/tenants/${tenantId}/ledger/dashboard`, { token })
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [tenantId]);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!summary) {
    return <p className="text-[var(--muted-foreground)]">Loading...</p>;
  }

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Financial Summary</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Cash Balance</p>
          <p className="mt-1 text-lg font-semibold text-[var(--primary)]">{format(summary.cashBalance)}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Revenue</p>
          <p className="mt-1 text-lg font-semibold">{format(summary.income)}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Expenses</p>
          <p className="mt-1 text-lg font-semibold">{format(summary.expenses)}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Profit</p>
          <p className={`mt-1 text-lg font-semibold ${summary.profit >= 0 ? 'text-[var(--primary)]' : 'text-red-500'}`}>
            {format(summary.profit)}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Assets</p>
          <p className="mt-1 text-lg font-semibold">{format(summary.assets)}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Liabilities</p>
          <p className="mt-1 text-lg font-semibold">{format(summary.liabilities)}</p>
        </div>
      </div>
      <div className="flex gap-4">
        <Link
          href={`/dashboard/${tenantId}/journal`}
          className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
        >
          New Journal Entry
        </Link>
        <Link
          href={`/dashboard/${tenantId}/accounts`}
          className="rounded border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--muted)]"
        >
          Chart of Accounts
        </Link>
        {showInviteCa && (
          <Link
            href={`/dashboard/${tenantId}/team`}
            className="rounded border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--muted)]"
          >
            Invite CA
          </Link>
        )}
      </div>
    </div>
  );
}
