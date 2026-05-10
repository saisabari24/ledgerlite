'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type TrialBalance = {
  asOf: string;
  rows: Array<{ code: string; name: string; type: string; debit: number; credit: number }>;
  totalDebit: number;
  totalCredit: number;
};

export default function TrialBalanceReportPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const qs = asOf ? `?asOf=${asOf}` : '';
      const data = await api<TrialBalance>(`/tenants/${tenantId}/ledger/trial-balance${qs}`, { token });
      setTrialBalance(data);
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
      <h1 className="text-xl font-semibold">Trial Balance</h1>
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
      {!loading && trialBalance && (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <div className="border-b border-[var(--border)] bg-[var(--muted)] px-4 py-2">
            Trial Balance as of {trialBalance.asOf}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Account</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.rows.map((r) => (
                <tr key={r.code} className="border-b border-[var(--border)]">
                  <td className="px-4 py-2 font-mono">{r.code}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.type}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.debit ? format(r.debit) : ''}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.credit ? format(r.credit) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] font-medium">
                <td colSpan={3} className="px-4 py-2">
                  Total
                </td>
                <td className="px-4 py-2 text-right font-mono">{format(trialBalance.totalDebit)}</td>
                <td className="px-4 py-2 text-right font-mono">{format(trialBalance.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

