'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Account, JournalEntry } from '@/lib/api';

type LineState = {
  mainType: string;
  accountId: string;
  debit: number;
  credit: number;
};

export default function JournalPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineState[]>([
    { mainType: '', accountId: '', debit: 0, credit: 0 },
    { mainType: '', accountId: '', debit: 0, credit: 0 },
  ]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    Promise.all([
      api<Account[]>(`/tenants/${tenantId}/accounts`, { token }),
      api<JournalEntry[]>(`/tenants/${tenantId}/journal`, { token }),
    ]).then(([accs, ents]) => {
      setAccounts(accs);
      setEntries(ents);
    }).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [tenantId]);

  function addLine() {
    setLines((prev) => [...prev, { mainType: '', accountId: '', debit: 0, credit: 0 }]);
  }

  function updateLine(i: number, field: keyof LineState, value: string | number) {
    setLines((prev) => {
      const next = [...prev];

      if (field === 'mainType') {
        // When main type changes, reset account so user picks from filtered list
        next[i] = { ...next[i], mainType: String(value), accountId: '' };
      } else if (field === 'accountId') {
        const accountId = String(value);
        const account = accounts.find((a) => a.id === accountId);
        // When subtype (account) changes, auto-fill mainType based on the account
        if (account) {
          next[i] = { ...next[i], accountId, mainType: account.type };
        } else {
          next[i] = { ...next[i], accountId };
        }
      } else {
        next[i] = { ...next[i], [field]: value };
      }

      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    const payload = {
      date,
      description: description || undefined,
      lines: lines
        .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0))
        .map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
    };
    try {
      const created = await api<JournalEntry>(`/tenants/${tenantId}/journal`, {
        method: 'POST',
        body: JSON.stringify(payload),
        token,
      });
      setEntries((prev) => [created, ...prev]);
      setDescription('');
      setLines([
        { mainType: '', accountId: '', debit: 0, credit: 0 },
        { mainType: '', accountId: '', debit: 0, credit: 0 },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  async function post(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await api(`/tenants/${tenantId}/journal/${id}/post`, { method: 'POST', token });
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'POSTED' } : e)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post failed');
    }
  }

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

  const accountTypes = Array.from(new Set(accounts.map((a) => a.type))).sort();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Journal Entries</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Salary payment"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">Lines</label>
            <button type="button" onClick={addLine} className="text-sm text-[var(--primary)] hover:underline">
              + Add line
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => {
              const filteredAccounts = line.mainType
                ? accounts.filter((a) => a.type === line.mainType)
                : accounts;
              return (
                <div key={i} className="flex flex-wrap gap-2">
                  <select
                    value={line.mainType}
                    onChange={(e) => updateLine(i, 'mainType', e.target.value)}
                    className="min-w-[140px] rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    <option value="">Type</option>
                    {accountTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={line.accountId}
                    onChange={(e) => updateLine(i, 'accountId', e.target.value)}
                    className="flex-1 min-w-[180px] rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    <option value="">Select account</option>
                    {filteredAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Debit"
                  value={line.debit || ''}
                  onChange={(e) => updateLine(i, 'debit', e.target.value ? parseFloat(e.target.value) : 0)}
                  className="w-24 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Credit"
                  value={line.credit || ''}
                  onChange={(e) => updateLine(i, 'credit', e.target.value ? parseFloat(e.target.value) : 0)}
                  className="w-24 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                />
                </div>
              );
            })}
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create (Draft)'}
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Recent Entries</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border)]">
                  <td className="px-4 py-2">{e.date.split('T')[0]}</td>
                  <td className="px-4 py-2">{e.description || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${e.status === 'POSTED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {e.status === 'DRAFT' && (
                      <button
                        onClick={() => post(e.id)}
                        className="text-[var(--primary)] hover:underline"
                      >
                        Post
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
