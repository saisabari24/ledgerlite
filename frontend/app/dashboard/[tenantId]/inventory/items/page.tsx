'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Item } from '@/lib/api';

export default function InventoryItemsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('nos');
  const [formRate, setFormRate] = useState(0);
  const [formDescription, setFormDescription] = useState('');

  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('nos');
  const [editRate, setEditRate] = useState(0);
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    load(token);
  }, [tenantId]);

  async function load(token?: string) {
    const t = token ?? localStorage.getItem('token');
    if (!t) return;
    try {
      const list = await api<Item[]>(`/tenants/${tenantId}/inventory/items`, { token: t });
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
    setEditDescription(item.description ?? '');
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
        body: JSON.stringify({
          name: editName.trim(),
          unit: editUnit,
          rate: editRate,
          description: editDescription || undefined,
        }),
      });
      setEditingId(null);
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function createItem() {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!formCode.trim() || !formName.trim()) {
      setError('Code and name are required');
      return;
    }
    try {
      await api(`/tenants/${tenantId}/inventory/items`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          code: formCode.trim(),
          name: formName.trim(),
          unit: formUnit,
          rate: formRate,
          description: formDescription || undefined,
        }),
      });
      setFormCode('');
      setFormName('');
      setFormUnit('nos');
      setFormRate(0);
      setFormDescription('');
      setShowForm(false);
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  async function deleteItem(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setConfirmDeleteId(null);
    try {
      await api(`/tenants/${tenantId}/inventory/items/${id}`, { method: 'DELETE', token });
      setError('');
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Inventory Items</h1>
        <button
          type="button"
          className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Item'}
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
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium">Item Code</label>
              <input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="e.g. ITM001"
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Item Name</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Widget A"
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Unit</label>
              <input
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder="nos"
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Rate</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formRate || ''}
                onChange={(e) => setFormRate(e.target.value ? parseFloat(e.target.value) : 0)}
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium">Description</label>
            <input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
              onClick={createItem}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)]"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
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
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                  No items yet. Click &quot;+ Add Item&quot; to create one.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--border)]">
                {editingId === item.id ? (
                  <>
                    <td className="px-4 py-2 font-mono text-xs">{item.code}</td>
                    <td className="px-4 py-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                        className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={editRate || ''}
                        onChange={(e) => setEditRate(e.target.value ? parseFloat(e.target.value) : 0)}
                        className="w-24 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-right"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        className="mr-2 rounded bg-[var(--primary)] px-2 py-0.5 text-xs font-medium text-[var(--primary-foreground)]"
                        onClick={() => saveEdit(item)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="text-xs text-[var(--muted-foreground)] hover:underline"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 font-mono text-xs">{item.code}</td>
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">{item.unit}</td>
                    <td className="px-4 py-2 text-right font-mono">{format(Number(item.rate))}</td>
                    <td className="px-4 py-2 text-right text-xs">
                      <button
                        className="mr-2 text-[var(--muted-foreground)] hover:underline"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-500 hover:underline"
                        onClick={() => setConfirmDeleteId(item.id)}
                      >
                        Delete
                      </button>
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
              Delete{' '}
              <span className="text-red-500">
                {items.find((i) => i.id === confirmDeleteId)?.name}
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
                onClick={() => deleteItem(confirmDeleteId)}
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
