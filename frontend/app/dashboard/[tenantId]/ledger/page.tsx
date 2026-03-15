'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Account } from '@/lib/api';

type LedgerResult = {
  account: { id: string; code: string; name: string; type: string; balance: number } | null;
  entries: Array<{
    date: string;
    journalEntryId: string;
    description: string | null;
    debit: number;
    credit: number;
    balance: number;
  }>;
  openingBalance: number;
};

export default function LedgerPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [ledger, setLedger] = useState<LedgerResult | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    api<Account[]>(`/tenants/${tenantId}/accounts`, { token })
      .then(setAccounts)
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    if (!selectedAccountId) {
      setLedger(null);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    api<LedgerResult>(
      `/tenants/${tenantId}/ledger/account/${selectedAccountId}${qs ? `?${qs}` : ''}`,
      { token },
    )
      .then(setLedger)
      .catch(() => setLedger(null));
  }, [tenantId, selectedAccountId, from, to]);

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Ledger</h1>
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium">Account</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="mt-1 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          >
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
        </div>
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
      </div>
      {ledger && ledger.account && (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <div className="border-b border-[var(--border)] bg-[var(--muted)] px-4 py-2">
            <span className="font-mono font-medium">{ledger.account.code}</span> - {ledger.account.name}
            <span className="ml-2 text-sm text-[var(--muted-foreground)]">
              (Opening: {format(ledger.openingBalance)})
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Credit</th>
                <th className="px-4 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.entries.map((e, i) => (
                <tr key={i} className="border-b border-[var(--border)]">
                  <td className="px-4 py-2">{e.date}</td>
                  <td className="px-4 py-2">{e.description || '-'}</td>
                  <td className="px-4 py-2 text-right font-mono">{e.debit ? format(e.debit) : ''}</td>
                  <td className="px-4 py-2 text-right font-mono">{e.credit ? format(e.credit) : ''}</td>
                  <td className="px-4 py-2 text-right font-mono">{format(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedAccountId && !ledger?.account && (
        <p className="text-[var(--muted-foreground)]">No ledger entries for this account in the selected period.</p>
      )}
    </div>
  );
}
