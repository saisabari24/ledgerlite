'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type ProfitLoss = {
  from: string;
  to: string;
  income: { rows: Array<{ code: string; name: string; amount: number }>; total: number };
  expenses: { rows: Array<{ code: string; name: string; amount: number }>; total: number };
  netProfit: number;
};

export default function ProfitLossReportPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
  const [profitLoss, setProfitLoss] = useState<ProfitLoss | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api<ProfitLoss>(`/tenants/${tenantId}/ledger/profit-loss?from=${from}&to=${to}`, { token });
      setProfitLoss(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tenantId, from, to]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Profit And Loss</h1>
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={loadReport}
            className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-[var(--muted-foreground)]">Loading...</p>}
      {!loading && profitLoss && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)]">
            <div className="border-b border-[var(--border)] bg-[var(--muted)] px-4 py-2">
              Profit &amp; Loss ({profitLoss.from} to {profitLoss.to})
            </div>
            <div className="p-4">
              <h3 className="font-medium">Income</h3>
              <table className="mt-2 w-full text-sm">
                {profitLoss.income.rows.map((r) => (
                  <tr key={r.code}>
                    <td className="py-1 font-mono">{r.code}</td>
                    <td className="py-1">{r.name}</td>
                    <td className="py-1 text-right font-mono">{format(r.amount)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--border)] font-medium">
                  <td colSpan={2} className="py-2">
                    Total Income
                  </td>
                  <td className="py-2 text-right font-mono">{format(profitLoss.income.total)}</td>
                </tr>
              </table>
              <h3 className="mt-4 font-medium">Expenses</h3>
              <table className="mt-2 w-full text-sm">
                {profitLoss.expenses.rows.map((r) => (
                  <tr key={r.code}>
                    <td className="py-1 font-mono">{r.code}</td>
                    <td className="py-1">{r.name}</td>
                    <td className="py-1 text-right font-mono">{format(r.amount)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--border)] font-medium">
                  <td colSpan={2} className="py-2">
                    Total Expenses
                  </td>
                  <td className="py-2 text-right font-mono">{format(profitLoss.expenses.total)}</td>
                </tr>
              </table>
              <div className="mt-4 border-t-2 border-[var(--border)] pt-2">
                <span className="font-medium">Net Profit: </span>
                <span className={profitLoss.netProfit >= 0 ? 'text-[var(--primary)]' : 'text-red-500'}>
                  {format(profitLoss.netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

