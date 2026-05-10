'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Supplier } from '@/lib/api';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  gstin: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

export default function SuppliersPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
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
      const list = await api<Supplier[]>(`/tenants/${tenantId}/suppliers`, { token: t });
      setSuppliers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

  function handleFormChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function createSupplier() {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      await api(`/tenants/${tenantId}/suppliers`, {
        method: 'POST',
        token,
        body: JSON.stringify(form),
      });
      setForm(emptyForm);
      setShowForm(false);
      setError('');
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  function startEdit(s: Supplier) {
    setEditingId(s.id);
    setEditForm({
      name: s.name,
      email: s.email ?? '',
      phone: s.phone ?? '',
      gstin: s.gstin ?? '',
      address: s.address ?? '',
      city: s.city ?? '',
      state: s.state ?? '',
      pincode: s.pincode ?? '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(s: Supplier) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await api(`/tenants/${tenantId}/suppliers/${s.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(editForm),
      });
      setEditingId(null);
      setError('');
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function deleteSupplier(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setConfirmDeleteId(null);
    try {
      await api(`/tenants/${tenantId}/suppliers/${id}`, { method: 'DELETE', token });
      setError('');
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const inpCls =
    'w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Suppliers</h1>
        <button
          type="button"
          className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
          onClick={() => {
            setShowForm(true);
            setForm(emptyForm);
          }}
        >
          + New Supplier
        </button>
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

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">GSTIN</th>
              <th className="px-4 py-2 text-right">Outstanding</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {showForm && (
              <tr className="border-b border-[var(--border)] bg-[var(--card)]/40">
                <td className="px-4 py-2" colSpan={6}>
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      placeholder="Name *"
                      value={form.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className={inpCls}
                    />
                    <input
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      className={inpCls}
                    />
                    <input
                      placeholder="Phone"
                      value={form.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      className={inpCls}
                    />
                    <input
                      placeholder="GSTIN"
                      value={form.gstin}
                      onChange={(e) => handleFormChange('gstin', e.target.value)}
                      className={inpCls}
                    />
                    <input
                      placeholder="Address"
                      value={form.address}
                      onChange={(e) => handleFormChange('address', e.target.value)}
                      className={inpCls}
                    />
                    <input
                      placeholder="City"
                      value={form.city}
                      onChange={(e) => handleFormChange('city', e.target.value)}
                      className={inpCls}
                    />
                    <input
                      placeholder="State"
                      value={form.state}
                      onChange={(e) => handleFormChange('state', e.target.value)}
                      className={inpCls}
                    />
                    <input
                      placeholder="Pincode"
                      value={form.pincode}
                      onChange={(e) => handleFormChange('pincode', e.target.value)}
                      className={inpCls}
                    />
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded bg-[var(--primary)] px-3 py-1 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
                      onClick={createSupplier}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="text-xs text-[var(--muted-foreground)] hover:underline"
                      onClick={() => {
                        setShowForm(false);
                        setForm(emptyForm);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {suppliers.map((s) => {
              const isEditing = editingId === s.id;
              return (
                <tr key={s.id} className="border-b border-[var(--border)]">
                  {isEditing ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          className={inpCls}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.email}
                          onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                          className={inpCls}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                          className={inpCls}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.gstin}
                          onChange={(e) => setEditForm((p) => ({ ...p, gstin: e.target.value }))}
                          className={inpCls}
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {format(Number(s.balance))}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          className="rounded bg-[var(--primary)] px-2 py-1 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
                          onClick={() => saveEdit(s)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="ml-2 text-xs text-[var(--muted-foreground)] hover:underline"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2">{s.name}</td>
                      <td className="px-4 py-2">{s.email || '-'}</td>
                      <td className="px-4 py-2">{s.phone || '-'}</td>
                      <td className="px-4 py-2">{s.gstin || '-'}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {format(Number(s.balance))}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          className="text-xs text-[var(--muted-foreground)] hover:underline"
                          onClick={() => startEdit(s)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ml-2 text-xs text-red-500 hover:underline"
                          onClick={() => setConfirmDeleteId(s.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {suppliers.length === 0 && !error && (
        <p className="text-[var(--muted-foreground)]">
          No suppliers yet.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setShowForm(true);
              setForm(emptyForm);
            }}
          >
            Add your first supplier.
          </button>
        </p>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg">
            <p className="mb-1 text-sm text-[var(--muted-foreground)]">Delete supplier</p>
            <p className="mb-4 font-medium">
              Delete{' '}
              <span className="text-red-500">
                {suppliers.find((a) => a.id === confirmDeleteId)?.name}
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
                onClick={() => deleteSupplier(confirmDeleteId)}
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
