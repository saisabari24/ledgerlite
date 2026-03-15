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

type ProfitLoss = {
  from: string;
  to: string;
  income: { rows: Array<{ code: string; name: string; amount: number }>; total: number };
  expenses: { rows: Array<{ code: string; name: string; amount: number }>; total: number };
  netProfit: number;
};

type BalanceSheet = {
  asOf: string;
  assets: { rows: Array<{ code: string; name: string; balance: number }>; total: number };
  liabilities: { rows: Array<{ code: string; name: string; balance: number }>; total: number };
  equity: { rows: Array<{ code: string; name: string; balance: number }>; total: number };
  totalLiabilityEquity: number;
};

type ReportType = 'trial-balance' | 'profit-loss' | 'balance-sheet';

export default function ReportsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [reportType, setReportType] = useState<ReportType>('trial-balance');
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLoss | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      if (reportType === 'trial-balance') {
        const qs = asOf ? `?asOf=${asOf}` : '';
        const data = await api<TrialBalance>(`/tenants/${tenantId}/ledger/trial-balance${qs}`, { token });
        setTrialBalance(data);
        setProfitLoss(null);
        setBalanceSheet(null);
      } else if (reportType === 'profit-loss') {
        const data = await api<ProfitLoss>(`/tenants/${tenantId}/ledger/profit-loss?from=${from}&to=${to}`, { token });
        setProfitLoss(data);
        setTrialBalance(null);
        setBalanceSheet(null);
      } else {
        const qs = asOf ? `?asOf=${asOf}` : '';
        const data = await api<BalanceSheet>(`/tenants/${tenantId}/ledger/balance-sheet${qs}`, { token });
        setBalanceSheet(data);
        setTrialBalance(null);
        setProfitLoss(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tenantId, reportType, asOf, from, to]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium">Report</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="mt-1 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          >
            <option value="trial-balance">Trial Balance</option>
            <option value="profit-loss">Profit & Loss</option>
            <option value="balance-sheet">Balance Sheet</option>
          </select>
        </div>
        {(reportType === 'trial-balance' || reportType === 'balance-sheet') && (
          <div>
            <label className="block text-sm font-medium">As of</label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="mt-1 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
        )}
        {reportType === 'profit-loss' && (
          <>
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
          </>
        )}
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
                <td colSpan={3} className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right font-mono">{format(trialBalance.totalDebit)}</td>
                <td className="px-4 py-2 text-right font-mono">{format(trialBalance.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {!loading && profitLoss && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)]">
            <div className="border-b border-[var(--border)] bg-[var(--muted)] px-4 py-2">
              Profit & Loss ({profitLoss.from} to {profitLoss.to})
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
                  <td colSpan={2} className="py-2">Total Income</td>
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
                  <td colSpan={2} className="py-2">Total Expenses</td>
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
                  <td colSpan={2} className="py-2">Total Assets</td>
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
                  <td colSpan={2} className="py-2">Total Liabilities</td>
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
                  <td colSpan={2} className="py-2">Total Equity</td>
                  <td className="py-2 text-right font-mono">{format(balanceSheet.equity.total)}</td>
                </tr>
              </table>
              <div className="mt-4 border-t-2 border-[var(--border)] pt-2">
                <span className="font-medium">Total Liabilities & Equity: </span>
                <span className="font-mono">{format(balanceSheet.totalLiabilityEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
