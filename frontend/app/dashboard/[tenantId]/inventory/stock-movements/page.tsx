'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Account, Item, StockMovement } from '@/lib/api';

type MovementLineState = {
  itemId: string;
  quantity: number;
  fromAccountId: string;
  toAccountId: string;
};

export default function StockMovementsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [movementType, setMovementType] = useState<'TRANSFER' | 'ADJUSTMENT' | 'OPENING_BALANCE'>('TRANSFER');
  const [lines, setLines] = useState<MovementLineState[]>([
    { itemId: '', quantity: 1, fromAccountId: '', toAccountId: '' },
  ]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    Promise.all([
      api<StockMovement[]>(`/tenants/${tenantId}/inventory/stock-movements`, { token }),
      api<Item[]>(`/tenants/${tenantId}/inventory/items`, { token }),
      api<Account[]>(`/tenants/${tenantId}/accounts`, { token }),
    ]).then(([movs, it, accts]) => {
      setMovements(movs);
      setItems(it);
      setAccounts(accts);
    }).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [tenantId]);

  async function loadMovements() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const movs = await api<StockMovement[]>(`/tenants/${tenantId}/inventory/stock-movements`, { token });
    setMovements(movs);
  }

  function addLine() {
    setLines((prev) => [...prev, { itemId: '', quantity: 1, fromAccountId: '', toAccountId: '' }]);
  }

  function updateLine(i: number, field: keyof MovementLineState, value: string | number) {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function removeLine(i: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;

    const validLines = lines.filter((l) => l.itemId && l.quantity > 0);
    if (validLines.length === 0) {
      setError('Add at least one line with an item and quantity');
      return;
    }

    setSubmitting(true);
    try {
      await api(`/tenants/${tenantId}/inventory/stock-movements`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          date,
          description: description || undefined,
          movementType: movementType,
          lines: validLines.map((l) => ({
            itemId: l.itemId,
            quantity: Number(l.quantity),
            fromAccountId: l.fromAccountId || undefined,
            toAccountId: l.toAccountId || undefined,
          })),
        }),
      });
      setShowForm(false);
      setDescription('');
      setLines([{ itemId: '', quantity: 1, fromAccountId: '', toAccountId: '' }]);
      await loadMovements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  async function postMovement(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await api(`/tenants/${tenantId}/inventory/stock-movements/${id}/post`, { method: 'POST', token });
      setMovements((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'POSTED' } : m)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post failed');
    }
  }

  async function deleteMovement(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setConfirmDeleteId(null);
    try {
      await api(`/tenants/${tenantId}/inventory/stock-movements/${id}`, { method: 'DELETE', token });
      setMovements((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const leafAccounts = accounts.filter((a) => !a.isGroup);
  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stock Movements</h1>
        <button
          type="button"
          className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Movement'}
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button type="button" className="ml-2 font-medium hover:underline" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="grid gap-4 sm:grid-cols-3">
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
              <label className="block text-sm font-medium">Movement Type</label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as any)}
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="TRANSFER">Transfer</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="OPENING_BALANCE">Opening Balance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Warehouse to Store transfer"
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Items</label>
              <button type="button" onClick={addLine} className="text-sm text-[var(--primary)] hover:underline">
                + Add line
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    value={line.itemId}
                    onChange={(e) => updateLine(i, 'itemId', e.target.value)}
                    className="flex-1 min-w-[160px] rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    <option value="">Select item</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.code} - {it.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Qty"
                    value={line.quantity || ''}
                    onChange={(e) => updateLine(i, 'quantity', e.target.value ? parseFloat(e.target.value) : 0)}
                    className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  />
                  <select
                    value={line.fromAccountId}
                    onChange={(e) => updateLine(i, 'fromAccountId', e.target.value)}
                    className="min-w-[160px] rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    <option value="">From Account</option>
                    {leafAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-[var(--muted-foreground)]">→</span>
                  <select
                    value={line.toAccountId}
                    onChange={(e) => updateLine(i, 'toAccountId', e.target.value)}
                    className="min-w-[160px] rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    <option value="">To Account</option>
                    {leafAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create (Draft)'}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Movement No</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-center">Lines</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                  No stock movements yet. Click &quot;+ New Movement&quot; to create one.
                </td>
              </tr>
            )}
            {movements.map((m, idx) => (
              <tr key={m.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2 font-mono text-xs">{m.movementNo}</td>
                <td className="px-4 py-2">{m.date.split('T')[0]}</td>
                <td className="px-4 py-2">
                  <span className="text-xs">{m.movementType.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-2">{m.description || '-'}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      m.status === 'POSTED'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-center text-xs text-[var(--muted-foreground)]">
                  {m.lines?.length ?? 0} item(s)
                  <div className="mt-0.5">
                    {m.lines?.slice(0, 2).map((l) => (
                      <div key={l.id}>
                        {l.item?.name ?? l.itemId} × {Number(l.quantity)}
                      </div>
                    ))}
                    {(m.lines?.length ?? 0) > 2 && <div>...</div>}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  {m.status === 'DRAFT' && (
                    <button
                      onClick={() => postMovement(m.id)}
                      className="mr-3 text-[var(--primary)] hover:underline"
                    >
                      Post
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDeleteId(m.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg">
            <p className="mb-1 text-sm text-[var(--muted-foreground)]">Delete stock movement</p>
            <p className="mb-4 font-medium">
              Delete{' '}
              <span className="text-red-500">
                {movements.find((m) => m.id === confirmDeleteId)?.movementNo}
              </span>
              ? This cannot be undone.
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
                onClick={() => deleteMovement(confirmDeleteId)}
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
