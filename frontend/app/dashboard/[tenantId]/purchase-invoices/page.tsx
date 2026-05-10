'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, PurchaseInvoice, Supplier, Item, Account } from '@/lib/api';

type FormLine = {
  itemId: string;
  accountId: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
};

const statusStyle: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  UNPAID: 'bg-orange-100 text-orange-800',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
};

export default function PurchaseInvoicesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDueDate, setFormDueDate] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLines, setFormLines] = useState<FormLine[]>([
    { itemId: '', accountId: '', description: '', quantity: 1, rate: 0, taxRate: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);

  const leafAccounts = accounts.filter((a) => !a.isGroup);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    loadAll(token);
  }, [tenantId]);

  async function loadAll(token?: string) {
    const t = token ?? localStorage.getItem('token');
    if (!t) return;
    setLoading(true);
    setError('');
    try {
      const [inv, sup, itm, acc] = await Promise.all([
        api<PurchaseInvoice[]>(`/tenants/${tenantId}/purchases/invoices`, { token: t }),
        api<Supplier[]>(`/tenants/${tenantId}/suppliers`, { token: t }),
        api<Item[]>(`/tenants/${tenantId}/inventory/items`, { token: t }),
        api<Account[]>(`/tenants/${tenantId}/accounts`, { token: t }),
      ]);
      setInvoices(inv);
      setSuppliers(sup);
      setItems(itm);
      setAccounts(acc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function addLine() {
    setFormLines((prev) => [
      ...prev,
      { itemId: '', accountId: '', description: '', quantity: 1, rate: 0, taxRate: 0 },
    ]);
  }

  function updateLine(index: number, field: keyof FormLine, value: string | number) {
    setFormLines((prev) => {
      const updated = prev.map((line, i) => (i === index ? { ...line, [field]: value } : line));
      return updated;
    });
  }

  function removeLine(index: number) {
    setFormLines((prev) => prev.filter((_, i) => i !== index));
  }

  const lineAmounts = formLines.map((l) => {
    const amt = l.quantity * l.rate;
    const tax = amt * (l.taxRate / 100);
    return { amount: amt, tax };
  });

  const subtotal = lineAmounts.reduce((s, l) => s + l.amount, 0);
  const taxTotal = lineAmounts.reduce((s, l) => s + l.tax, 0);
  const total = subtotal + taxTotal;

  function resetForm() {
    setShowForm(false);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormDueDate('');
    setFormSupplierId('');
    setFormDescription('');
    setFormLines([{ itemId: '', accountId: '', description: '', quantity: 1, rate: 0, taxRate: 0 }]);
    setError('');
  }

  async function createInvoice() {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!formSupplierId) { setError('Supplier is required'); return; }
    if (formLines.length === 0) { setError('At least one line is required'); return; }
    for (const line of formLines) {
      if (!line.itemId) { setError('Each line must have an item'); return; }
    }
    setSubmitting(true);
    setError('');
    try {
      await api(`/tenants/${tenantId}/purchases/invoices`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          date: formDate,
          dueDate: formDueDate || null,
          supplierId: formSupplierId,
          description: formDescription || null,
          lines: formLines.map((l) => ({
            itemId: l.itemId,
            accountId: l.accountId || null,
            description: l.description || null,
            quantity: l.quantity,
            rate: l.rate,
            taxRate: l.taxRate,
          })),
        }),
      });
      resetForm();
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function postInvoice(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setPostingId(id);
    setError('');
    try {
      await api(`/tenants/${tenantId}/purchases/invoices/${id}/post`, { method: 'POST', token });
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Post failed');
    } finally {
      setPostingId(null);
    }
  }

  async function deleteInvoice(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setConfirmDeleteId(null);
    setError('');
    try {
      await api(`/tenants/${tenantId}/purchases/invoices/${id}`, { method: 'DELETE', token });
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const format = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Purchase Invoices</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Purchase Invoices</h1>
        {!showForm && (
          <button
            type="button"
            className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
            onClick={() => setShowForm(true)}
          >
            + New Invoice
          </button>
        )}
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

      {showForm && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Due Date</label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Supplier</label>
              <select
                value={formSupplierId}
                onChange={(e) => setFormSupplierId(e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs"
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Description</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs"
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Line Items</span>
              <button
                type="button"
                className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs font-medium hover:bg-[var(--muted)]"
                onClick={addLine}
              >
                + Add line
              </button>
            </div>
            {formLines.map((line, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded border border-[var(--border)] bg-[var(--background)] p-2">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Item</label>
                  <select
                    value={line.itemId}
                    onChange={(e) => updateLine(i, 'itemId', e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-xs"
                  >
                    <option value="">Select</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>{it.code} - {it.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-[100px]">
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Account</label>
                  <select
                    value={line.accountId}
                    onChange={(e) => updateLine(i, 'accountId', e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-xs"
                  >
                    <option value="">None</option>
                    {leafAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-[140px]">
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Description</label>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(i, 'description', e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-xs"
                    placeholder="Line desc"
                  />
                </div>
                <div className="w-[70px]">
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Qty</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(i, 'quantity', Number(e.target.value))}
                    className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-xs"
                  />
                </div>
                <div className="w-[90px]">
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Rate</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.rate}
                    onChange={(e) => updateLine(i, 'rate', Number(e.target.value))}
                    className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-xs"
                  />
                </div>
                <div className="w-[70px]">
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Tax %</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.taxRate}
                    onChange={(e) => updateLine(i, 'taxRate', Number(e.target.value))}
                    className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-xs"
                  />
                </div>
                <div className="w-[90px] text-right">
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Amount</label>
                  <span className="text-xs font-mono">{format(lineAmounts[i].amount)}</span>
                </div>
                {formLines.length > 1 && (
                  <button
                    type="button"
                    className="text-red-500 text-xs hover:underline pb-1"
                    onClick={() => removeLine(i)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 border-t border-[var(--border)] pt-2 text-xs font-mono">
            <span>Subtotal: {format(subtotal)}</span>
            <span>Tax: {format(taxTotal)}</span>
            <span className="font-semibold">Total: {formatCurrency(total)}</span>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)]"
              onClick={resetForm}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
              onClick={createInvoice}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Invoice #</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Supplier</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNo}</td>
                <td className="px-4 py-2">{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-2">{inv.supplier?.name ?? '-'}</td>
                <td className="px-4 py-2 text-right font-mono">{format(inv.total)}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusStyle[inv.status] ?? 'bg-gray-100 text-gray-800'}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {inv.status === 'DRAFT' && (
                      <>
                        <button
                          type="button"
                          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          onClick={() => postInvoice(inv.id)}
                          disabled={postingId === inv.id}
                        >
                          {postingId === inv.id ? 'Posting...' : 'Post'}
                        </button>
                        <button
                          type="button"
                          className="text-red-500 text-xs hover:underline"
                          onClick={() => setConfirmDeleteId(inv.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invoices.length === 0 && !error && (
        <p className="text-sm text-[var(--muted-foreground)]">
          No purchase invoices yet. Click &ldquo;+ New Invoice&rdquo; to create one.
        </p>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg">
            <p className="mb-1 text-sm text-[var(--muted-foreground)]">Delete invoice</p>
            <p className="mb-4 font-medium">
              Delete{' '}
              <span className="text-red-500">
                {invoices.find((i) => i.id === confirmDeleteId)?.invoiceNo}
              </span>
              ? This will reverse any journal entries. Cannot be undone.
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
                onClick={() => deleteInvoice(confirmDeleteId)}
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
