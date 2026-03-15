'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Account } from '@/lib/api';

export default function AccountsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [creatingFor, setCreatingFor] = useState<{ parentId: string | 'root'; isGroup: boolean } | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'>('ASSET');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    load(token);
  }, [tenantId]);

  async function load(token: string) {
    try {
      const list = await api<Account[]>(`/tenants/${tenantId}/accounts`, { token });
      setAccounts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }

  async function createAccount(parentId: string | 'root', isGroup: boolean) {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!formCode.trim() || !formName.trim()) {
      setError('Code and name are required');
      return;
    }
    try {
      await api<Account>(`/tenants/${tenantId}/accounts`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          code: formCode.trim(),
          name: formName.trim(),
          type: formType,
          parentId: parentId === 'root' ? undefined : parentId,
          isGroup,
        }),
      });
      setFormCode('');
      setFormName('');
      setCreatingFor(null);
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  async function deleteAccount(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!confirm('Delete this account? It must have no child accounts or entries.')) return;
    try {
      await api(`/tenants/${tenantId}/accounts/${id}`, { method: 'DELETE', token });
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  if (error) {
    return <p className="text-red-500 whitespace-pre-line">{error}</p>;
  }

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

  const tree = useMemo(() => {
    const byParent: Record<string | 'root', Account[]> = { root: [] };
    for (const acc of accounts) {
      const key = (acc.parentId ?? 'root') as string | 'root';
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(acc);
    }
    const sortFn = (a: Account, b: Account) => a.code.localeCompare(b.code);
    Object.values(byParent).forEach((list) => list.sort(sortFn));
    return byParent;
  }, [accounts]);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function renderRows(parentKey: string | 'root', level: number): JSX.Element[] {
    const children = tree[parentKey] ?? [];
    const rows: JSX.Element[] = [];
    for (const acc of children) {
      const isGroup = !!acc.isGroup;
      const indentStyle = { paddingLeft: `${level * 1.5}rem` };
      rows.push(
        <tr key={acc.id} className="border-b border-[var(--border)]">
          <td className="px-4 py-2 font-mono">
            {isGroup && (
              <button
                type="button"
                onClick={() => toggle(acc.id)}
                className="mr-1 text-xs text-[var(--muted-foreground)]"
              >
                {expanded[acc.id] ?? true ? '▾' : '▸'}
              </button>
            )}
            {acc.code}
          </td>
          <td className="px-4 py-2" style={indentStyle}>
            {isGroup ? '📁 ' : '﹒ '}
            {acc.name}
          </td>
          <td className="px-4 py-2">{acc.type}</td>
          <td className="px-4 py-2 text-right font-mono">
            {!isGroup ? format(Number(acc.balance)) : ''}
            {isGroup && (
              <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                <button
                  type="button"
                  className="mr-2 hover:underline"
                  onClick={() => {
                    setCreatingFor({ parentId: acc.id, isGroup: false });
                    setFormType(acc.type as any);
                  }}
                >
                  Add Account
                </button>
                <button
                  type="button"
                  className="mr-2 hover:underline"
                  onClick={() => {
                    setCreatingFor({ parentId: acc.id, isGroup: true });
                    setFormType(acc.type as any);
                  }}
                >
                  Add Group
                </button>
                <button
                  type="button"
                  className="text-red-500 hover:underline"
                  onClick={() => deleteAccount(acc.id)}
                >
                  Delete Group
                </button>
              </span>
            )}
            {!isGroup && (
              <button
                type="button"
                className="ml-2 text-xs text-red-500 hover:underline"
                onClick={() => deleteAccount(acc.id)}
              >
                Delete
              </button>
            )}
          </td>
        </tr>,
      );
      if (isGroup && (expanded[acc.id] ?? true)) {
        rows.push(...renderRows(acc.id, level + 1));
      }
    }
    return rows;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Chart of Accounts</h1>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {renderRows('root', 0)}
            {creatingFor && (
              <tr className="border-t border-[var(--border)] bg-[var(--card)]/40">
                <td className="px-4 py-2 font-mono">
                  <input
                    placeholder="Code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    placeholder={creatingFor.isGroup ? 'Group name' : 'Account name'}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={formType}
                    onChange={(e) =>
                      setFormType(e.target.value as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE')
                    }
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="EQUITY">EQUITY</option>
                    <option value="INCOME">INCOME</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    className="mr-2 rounded bg-[var(--primary)] px-3 py-1 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
                    onClick={() => createAccount(creatingFor.parentId, creatingFor.isGroup)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="text-xs text-[var(--muted-foreground)] hover:underline"
                    onClick={() => {
                      setCreatingFor(null);
                      setFormCode('');
                      setFormName('');
                    }}
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {accounts.length === 0 && !error && (
        <p className="text-[var(--muted-foreground)]">No accounts. Click &quot;Seed Default Accounts&quot; to create a standard chart.</p>
      )}
    </div>
  );
}
