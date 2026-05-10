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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'>('ASSET');
  const [editIsGroup, setEditIsGroup] = useState(false);
  const [editParentId, setEditParentId] = useState<string | ''>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    load(token);
  }, [tenantId]);

  async function load(token?: string) {
    const t = token ?? localStorage.getItem('token');
    if (!t) return;
    try {
      const list = await api<Account[]>(`/tenants/${tenantId}/accounts`, { token: t });
      setAccounts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }

  function startEdit(acc: Account) {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditType(acc.type as any);
    setEditIsGroup(!!acc.isGroup);
    setEditParentId(acc.parentId ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(acc: Account) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await api(`/tenants/${tenantId}/accounts/${acc.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          name: editName.trim(),
          type: editType,
          isGroup: editIsGroup,
          parentId: editParentId === '' ? null : editParentId,
        }),
      });
      setEditingId(null);
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
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
    setConfirmDeleteId(null);
    try {
      await api(`/tenants/${tenantId}/accounts/${id}`, { method: 'DELETE', token });
      setError('');
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

  const groupAccounts = useMemo(
    () => accounts.filter((a) => a.isGroup),
    [accounts],
  );

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

  function isDescendantOf(parentId: string, targetId: string): boolean {
    for (const child of tree[parentId] ?? []) {
      if (child.id === targetId) return true;
      if (child.isGroup && isDescendantOf(child.id, targetId)) return true;
    }
    return false;
  }

  function renderRows(parentKey: string | 'root', level: number): JSX.Element[] {
    const children = tree[parentKey] ?? [];
    const rows: JSX.Element[] = [];
    for (const acc of children) {
      const isGroup = !!acc.isGroup;
      const isEditing = editingId === acc.id;
      const indentStyle = { paddingLeft: `${level * 1.5}rem` };

      if (isEditing) {
        const editParentOptions = groupAccounts.filter(
          (g) => g.id !== acc.id && !isDescendantOf(g.id, acc.id),
        );
        rows.push(
          <tr key={`edit-${acc.id}`} className="border-b border-[var(--border)] bg-[var(--card)]/60">
            <td className="px-4 py-2 font-mono text-xs">{acc.code}</td>
            <td className="px-4 py-2" style={indentStyle}>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              />
            </td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                  className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                >
                  <option value="ASSET">ASSET</option>
                  <option value="LIABILITY">LIABILITY</option>
                  <option value="EQUITY">EQUITY</option>
                  <option value="INCOME">INCOME</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </div>
            </td>
            <td className="px-4 py-2 text-right">
              <div className="flex items-center justify-end gap-2 text-xs">
                {editIsGroup && (
                  <select
                    value={editParentId}
                    onChange={(e) => setEditParentId(e.target.value)}
                    className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  >
                    <option value="">(root)</option>
                    {editParentOptions.map((g) => (
                      <option key={g.id} value={g.id}>{g.code} {g.name}</option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-1 text-[var(--muted-foreground)]">
                  <input
                    type="checkbox"
                    checked={editIsGroup}
                    onChange={(e) => setEditIsGroup(e.target.checked)}
                  />
                  Group
                </label>
                <button
                  type="button"
                  className="rounded bg-[var(--primary)] px-2 py-1 font-medium text-[var(--primary-foreground)] hover:opacity-90"
                  onClick={() => saveEdit(acc)}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="text-[var(--muted-foreground)] hover:underline"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </div>
            </td>
          </tr>,
        );
      } else {
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
              <span className="ml-2 text-xs">
                <button
                  type="button"
                  className="mr-2 text-[var(--muted-foreground)] hover:underline"
                  onClick={() => startEdit(acc)}
                >
                  Edit
                </button>
                {isGroup && (
                  <>
                    <button
                      type="button"
                      className="mr-2 text-[var(--muted-foreground)] hover:underline"
                      onClick={() => {
                        setCreatingFor({ parentId: acc.id, isGroup: false });
                        setFormType(acc.type as any);
                      }}
                    >
                      +Account
                    </button>
                    <button
                      type="button"
                      className="mr-2 text-[var(--muted-foreground)] hover:underline"
                      onClick={() => {
                        setCreatingFor({ parentId: acc.id, isGroup: true });
                        setFormType(acc.type as any);
                      }}
                    >
                      +Group
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="text-red-500 hover:underline"
                  onClick={() => setConfirmDeleteId(acc.id)}
                >
                  Delete
                </button>
              </span>
            </td>
          </tr>,
        );
      }

      if (isGroup && (expanded[acc.id] ?? true) && editingId !== acc.id && confirmDeleteId !== acc.id) {
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

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button
            type="button"
            className="ml-2 font-medium hover:underline"
            onClick={() => setError('')}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
          onClick={() => {
            setCreatingFor({ parentId: 'root', isGroup: true });
            setFormType('ASSET');
            setFormCode('');
            setFormName('');
          }}
        >
          + Add Group
        </button>
        <button
          type="button"
          className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)]"
          onClick={() => {
            setCreatingFor({ parentId: 'root', isGroup: false });
            setFormType('ASSET');
            setFormCode('');
            setFormName('');
          }}
        >
          + Add Account
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-right">Balance / Actions</th>
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
                      setFormType(e.target.value as any)
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
        <p className="text-[var(--muted-foreground)]">
          No accounts yet. Use the buttons above to add groups and accounts.
        </p>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg">
            <p className="mb-1 text-sm text-[var(--muted-foreground)]">Delete account</p>
            <p className="mb-4 font-medium">
              Delete <span className="text-red-500">{accounts.find((a) => a.id === confirmDeleteId)?.name}</span>?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-[var(--border)] bg-[var(--background)] px-4 py-1.5 text-xs font-medium hover:bg-[var(--muted)]"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                onClick={() => deleteAccount(confirmDeleteId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
