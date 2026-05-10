'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Customer } from '@/lib/api';

export default function CustomersPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPincode, setFormPincode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
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
      const list = await api<Customer[]>(`/tenants/${tenantId}/customers`, { token: t });
      setCustomers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }

  function startEdit(c: Customer) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditEmail(c.email ?? '');
    setEditPhone(c.phone ?? '');
    setEditGstin(c.gstin ?? '');
    setEditAddress(c.address ?? '');
    setEditCity(c.city ?? '');
    setEditState(c.state ?? '');
    setEditPincode(c.pincode ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(c: Customer) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await api(`/tenants/${tenantId}/customers/${c.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          gstin: editGstin.trim() || null,
          address: editAddress.trim() || null,
          city: editCity.trim() || null,
          state: editState.trim() || null,
          pincode: editPincode.trim() || null,
        }),
      });
      setEditingId(null);
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function createCustomer() {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!formName.trim()) {
      setError('Name is required');
      return;
    }
    try {
      await api<Customer>(`/tenants/${tenantId}/customers`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          gstin: formGstin.trim() || null,
          address: formAddress.trim() || null,
          city: formCity.trim() || null,
          state: formState.trim() || null,
          pincode: formPincode.trim() || null,
        }),
      });
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormGstin('');
      setFormAddress('');
      setFormCity('');
      setFormState('');
      setFormPincode('');
      setShowNewForm(false);
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  async function deleteCustomer(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setConfirmDeleteId(null);
    try {
      await api(`/tenants/${tenantId}/customers/${id}`, { method: 'DELETE', token });
      setError('');
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Customers</h1>
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

      <button
        type="button"
        className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
        onClick={() => {
          setShowNewForm(true);
          setFormName('');
          setFormEmail('');
          setFormPhone('');
          setFormGstin('');
          setFormAddress('');
          setFormCity('');
          setFormState('');
          setFormPincode('');
        }}
      >
        + New Customer
      </button>

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
            {showNewForm && (
              <tr className="border-b border-[var(--border)] bg-[var(--card)]/40">
                <td className="px-4 py-2">
                  <input
                    placeholder="Name *"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    placeholder="Email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    placeholder="Phone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    placeholder="GSTIN"
                    value={formGstin}
                    onChange={(e) => setFormGstin(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-[var(--muted-foreground)]">
                  —
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    className="mr-2 rounded bg-[var(--primary)] px-3 py-1 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
                    onClick={createCustomer}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="text-xs text-[var(--muted-foreground)] hover:underline"
                    onClick={() => {
                      setShowNewForm(false);
                      setFormName('');
                      setFormEmail('');
                      setFormPhone('');
                      setFormGstin('');
                      setFormAddress('');
                      setFormCity('');
                      setFormState('');
                      setFormPincode('');
                    }}
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            )}
            {showNewForm && (
              <tr className="border-b border-[var(--border)] bg-[var(--card)]/40">
                <td className="px-4 py-2" colSpan={6}>
                  <div className="flex flex-wrap gap-2">
                    <input
                      placeholder="Address"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="flex-1 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    />
                    <input
                      placeholder="City"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-32 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    />
                    <input
                      placeholder="State"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      className="w-32 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    />
                    <input
                      placeholder="Pincode"
                      value={formPincode}
                      onChange={(e) => setFormPincode(e.target.value)}
                      className="w-28 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    />
                  </div>
                </td>
              </tr>
            )}
            {customers.map((c) => {
              const isEditing = editingId === c.id;

              if (isEditing) {
                return (
                  <tr key={`edit-${c.id}`} className="border-b border-[var(--border)] bg-[var(--card)]/60">
                    <td className="px-4 py-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editGstin}
                        onChange={(e) => setEditGstin(e.target.value)}
                        className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {format(Number(c.balance))}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <div className="flex flex-col gap-1">
                          <input
                            placeholder="Address"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                          />
                          <div className="flex gap-1">
                            <input
                              placeholder="City"
                              value={editCity}
                              onChange={(e) => setEditCity(e.target.value)}
                              className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                            />
                            <input
                              placeholder="State"
                              value={editState}
                              onChange={(e) => setEditState(e.target.value)}
                              className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                            />
                            <input
                              placeholder="Pincode"
                              value={editPincode}
                              onChange={(e) => setEditPincode(e.target.value)}
                              className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rounded bg-[var(--primary)] px-2 py-1 font-medium text-[var(--primary-foreground)] hover:opacity-90"
                          onClick={() => saveEdit(c)}
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
                  </tr>
                );
              }

              return (
                <tr key={c.id} className="border-b border-[var(--border)]">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-[var(--muted-foreground)]">{c.email ?? '—'}</td>
                  <td className="px-4 py-2 text-[var(--muted-foreground)]">{c.phone ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{c.gstin ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {format(Number(c.balance))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="mr-2 text-xs text-[var(--muted-foreground)] hover:underline"
                      onClick={() => startEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:underline"
                      onClick={() => setConfirmDeleteId(c.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {customers.length === 0 && !error && (
        <p className="text-[var(--muted-foreground)]">
          No customers yet. Click "+ New Customer" to add one.
        </p>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg">
            <p className="mb-1 text-sm text-[var(--muted-foreground)]">Delete customer</p>
            <p className="mb-4 font-medium">
              Delete <span className="text-red-500">{customers.find((c) => c.id === confirmDeleteId)?.name}</span>?
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
                onClick={() => deleteCustomer(confirmDeleteId)}
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
