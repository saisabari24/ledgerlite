'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type BalanceSheet = {
  asOf: string;
  assets: { rows: Array<{ code: string; name: string; balance: number }>; total: number };
  liabilities: { rows: Array<{ code: string; name: string; balance: number }>; total: number };
  equity: { rows: Array<{ code: string; name: string; balance: number }>; total: number };
  totalLiabilityEquity: number;
};

export default function BalanceSheetReportPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const qs = asOf ? `?asOf=${asOf}` : '';
      const data = await api<BalanceSheet>(`/tenants/${tenantId}/ledger/balance-sheet${qs}`, { token });
      setBalanceSheet(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tenantId, asOf]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Balance Sheet</h1>
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium">As of</label>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
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
      {!loading && balanceSheet && (
        <div className="rounded-lg border border-[var(--border)]">
          <div className="border-b border-[var(--border)] bg-[var(--muted)] px-4 py-2">
            Balance Sheet as of {balanceSheet.asOf}
          </div>
          <div className="grid gap-6 p-4 sm:grid-cols-2">
            <div>
              <h3 className="font-medium">Assets</h3>
              <table className="mt-2 w-full text-sm">
                {balanceSheet.assets.rows.map((r) => (
                  <tr key={r.code}>
                    <td className="py-1 font-mono">{r.code}</td>
                    <td className="py-1">{r.name}</td>
                    <td className="py-1 text-right font-mono">{format(r.balance)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--border)] font-medium">
                  <td colSpan={2} className="py-2">
                    Total Assets
                  </td>
                  <td className="py-2 text-right font-mono">{format(balanceSheet.assets.total)}</td>
                </tr>
              </table>
            </div>
            <div>
              <h3 className="font-medium">Liabilities</h3>
              <table className="mt-2 w-full text-sm">
                {balanceSheet.liabilities.rows.map((r) => (
                  <tr key={r.code}>
                    <td className="py-1 font-mono">{r.code}</td>
                    <td className="py-1">{r.name}</td>
                    <td className="py-1 text-right font-mono">{format(r.balance)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--border)] font-medium">
                  <td colSpan={2} className="py-2">
                    Total Liabilities
                  </td>
                  <td className="py-2 text-right font-mono">{format(balanceSheet.liabilities.total)}</td>
                </tr>
              </table>
              <h3 className="mt-4 font-medium">Equity</h3>
              <table className="mt-2 w-full text-sm">
                {balanceSheet.equity.rows.map((r) => (
                  <tr key={r.code}>
                    <td className="py-1 font-mono">{r.code}</td>
                    <td className="py-1">{r.name}</td>
                    <td className="py-1 text-right font-mono">{format(r.balance)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--border)] font-medium">
                  <td colSpan={2} className="py-2">
                    Total Equity
                  </td>
                  <td className="py-2 text-right font-mono">{format(balanceSheet.equity.total)}</td>
                </tr>
              </table>
              <div className="mt-4 border-t-2 border-[var(--border)] pt-2">
                <span className="font-medium">Total Liabilities &amp; Equity: </span>
                <span className="font-mono">{format(balanceSheet.totalLiabilityEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

