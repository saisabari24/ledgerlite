'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Item } from '@/lib/api';

export default function SalesItemsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('nos');
  const [editRate, setEditRate] = useState(0);
  const [editTaxRate, setEditTaxRate] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    load();
  }, [tenantId]);

  async function load() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const list = await api<Item[]>(`/tenants/${tenantId}/inventory/items`, { token });
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditUnit(item.unit);
    setEditRate(Number(item.rate));
    setEditTaxRate(Number(item.taxRate));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(item: Item) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await api(`/tenants/${tenantId}/inventory/items/${item.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ name: editName.trim(), unit: editUnit, rate: editRate, taxRate: editTaxRate }),
      });
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function deleteItem(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setConfirmDeleteId(null);
    try {
      await api(`/tenants/${tenantId}/inventory/items/${id}`, { method: 'DELETE', token });
      setError('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sales Items</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Items managed from the{' '}
            <a href={`/dashboard/${tenantId}/inventory/items`} className="text-[var(--primary)] hover:underline">
              Inventory Items
            </a>{' '}
            page.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button type="button" className="ml-2 font-medium hover:underline" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Unit</th>
              <th className="px-4 py-2 text-right">Rate</th>
              <th className="px-4 py-2 text-right">Tax %</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                  No items found.{' '}
                  <a href={`/dashboard/${tenantId}/inventory/items`} className="text-[var(--primary)] hover:underline">
                    Add items here
                  </a>
                  .
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--border)]">
                {editingId === item.id ? (
                  <>
                    <td className="px-4 py-2 font-mono text-xs">{item.code}</td>
                    <td className="px-4 py-2">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" step="0.01" value={editRate} onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)} className="w-24 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-right" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" step="0.01" value={editTaxRate} onChange={(e) => setEditTaxRate(parseFloat(e.target.value) || 0)} className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-right" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" className="mr-2 rounded bg-[var(--primary)] px-2 py-0.5 text-xs font-medium text-[var(--primary-foreground)]" onClick={() => saveEdit(item)}>Save</button>
                      <button type="button" className="text-xs text-[var(--muted-foreground)] hover:underline" onClick={cancelEdit}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 font-mono text-xs">{item.code}</td>
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">{item.unit}</td>
                    <td className="px-4 py-2 text-right font-mono">{format(Number(item.rate))}</td>
                    <td className="px-4 py-2 text-right">{Number(item.taxRate).toFixed(2)}%</td>
                    <td className="px-4 py-2 text-right text-xs">
                      <button className="mr-2 text-[var(--muted-foreground)] hover:underline" onClick={() => startEdit(item)}>Edit</button>
                      <button className="text-red-500 hover:underline" onClick={() => setConfirmDeleteId(item.id)}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg">
            <p className="mb-1 text-sm text-[var(--muted-foreground)]">Delete item</p>
            <p className="mb-4 font-medium">
              Delete <span className="text-red-500">{items.find((i) => i.id === confirmDeleteId)?.name}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded border border-[var(--border)] bg-[var(--background)] px-4 py-1.5 text-xs font-medium hover:bg-[var(--muted)]" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button type="button" className="rounded bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700" onClick={() => deleteItem(confirmDeleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
