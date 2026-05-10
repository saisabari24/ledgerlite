'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, SalesInvoice, Customer, Item, Account } from '@/lib/api';

interface LineForm {
  itemId: string;
  accountId: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
}

interface CreateForm {
  date: string;
  dueDate: string;
  customerId: string;
  description: string;
  terms: string;
  lines: LineForm[];
}

type InvoiceStatus = 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

const statusStyles: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  UNPAID: 'bg-orange-100 text-orange-800',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
};

const emptyLine = (): LineForm => ({
  itemId: '',
  accountId: '',
  description: '',
  quantity: 1,
  rate: 0,
  taxRate: 0,
});

function computeAmounts(lines: LineForm[]) {
  let subtotal = 0;
  let tax = 0;
  for (const l of lines) {
    const amt = (l.quantity || 0) * (l.rate || 0);
    subtotal += amt;
    tax += amt * ((l.taxRate || 0) / 100);
  }
  return { subtotal, tax, total: subtotal + tax };
}

const format = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function SalesInvoicesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [leafAccounts, setLeafAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    customerId: '',
    description: '',
    terms: '',
    lines: [emptyLine()],
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    loadAll(token);
  }, [tenantId]);

  async function loadAll(token?: string) {
    const t = token ?? localStorage.getItem('token');
    if (!t) return;
    setLoading(true);
    try {
      const [inv, cust, itm, accs] = await Promise.all([
        api<SalesInvoice[]>(`/tenants/${tenantId}/sales/invoices`, { token: t }),
        api<Customer[]>(`/tenants/${tenantId}/customers`, { token: t }),
        api<Item[]>(`/tenants/${tenantId}/inventory/items`, { token: t }),
        api<Account[]>(`/tenants/${tenantId}/accounts`, { token: t }),
      ]);
      setInvoices(inv);
      setCustomers(cust);
      setItems(itm);
      setLeafAccounts(accs.filter((a) => !a.isGroup));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof CreateForm>(key: K, value: CreateForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateLine(idx: number, key: keyof LineForm, value: string | number) {
    setForm((prev) => {
      const lines = prev.lines.map((l, i) => (i === idx ? { ...l, [key]: value } : l));
      return { ...prev, lines };
    });
  }

  function addLine() {
    setForm((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }));
  }

  function removeLine(idx: number) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.length > 1 ? prev.lines.filter((_, i) => i !== idx) : prev.lines,
    }));
  }

  async function createInvoice() {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!form.customerId || !form.date) {
      setError('Date and customer are required');
      return;
    }
    if (!form.lines.length || form.lines.every((l) => !l.itemId)) {
      setError('At least one item line is required');
      return;
    }
    try {
      await api<SalesInvoice>(`/tenants/${tenantId}/sales/invoices`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          date: form.date,
          dueDate: form.dueDate || undefined,
          customerId: form.customerId,
          description: form.description || undefined,
          terms: form.terms || undefined,
          lines: form.lines
            .filter((l) => l.itemId)
            .map((l) => ({
              itemId: l.itemId,
              accountId: l.accountId || undefined,
              description: l.description || undefined,
              quantity: l.quantity,
              rate: l.rate,
              taxRate: l.taxRate || undefined,
            })),
        }),
      });
      setShowForm(false);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        dueDate: '',
        customerId: '',
        description: '',
        terms: '',
        lines: [emptyLine()],
      });
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  async function postInvoice(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await api(`/tenants/${tenantId}/sales/invoices/${id}/post`, { method: 'POST', token });
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Post failed');
    }
  }

  async function deleteInvoice(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setConfirmDeleteId(null);
    try {
      await api(`/tenants/${tenantId}/sales/invoices/${id}`, { method: 'DELETE', token });
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const { subtotal, tax, total } = computeAmounts(form.lines);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sales Invoices</h1>
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
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]/40 p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-[var(--muted-foreground)] mb-0.5">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateForm('date', e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-[var(--muted-foreground)] mb-0.5">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => updateForm('dueDate', e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-[var(--muted-foreground)] mb-0.5">Customer *</label>
              <select
                value={form.customerId}
                onChange={(e) => updateForm('customerId', e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-[var(--muted-foreground)] mb-0.5">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-[var(--muted-foreground)] mb-0.5">Terms</label>
              <input
                type="text"
                value={form.terms}
                onChange={(e) => updateForm('terms', e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Line Items</span>
              <button
                type="button"
                className="text-xs text-[var(--primary)] hover:underline"
                onClick={addLine}
              >
                + Add line
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                    <th className="px-2 py-1 text-left">Item</th>
                    <th className="px-2 py-1 text-left">Account</th>
                    <th className="px-2 py-1 text-left">Description</th>
                    <th className="px-2 py-1 text-right">Qty</th>
                    <th className="px-2 py-1 text-right">Rate</th>
                    <th className="px-2 py-1 text-right">Tax %</th>
                    <th className="px-2 py-1 text-right">Amount</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => {
                    const selectedItem = items.find((i) => i.id === line.itemId);
                    const amt = (line.quantity || 0) * (line.rate || 0);
                    return (
                      <tr key={idx} className="border-b border-[var(--border)]">
                        <td className="px-2 py-1">
                          <select
                            value={line.itemId}
                            onChange={(e) => {
                              const item = items.find((i) => i.id === e.target.value);
                              updateLine(idx, 'itemId', e.target.value);
                              if (item) {
                                updateLine(idx, 'rate', item.rate);
                                updateLine(idx, 'taxRate', item.taxRate);
                              }
                            }}
                            className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-xs"
                          >
                            <option value="">Select</option>
                            {items.map((i) => (
                              <option key={i.id} value={i.id}>{i.code} - {i.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={line.accountId}
                            onChange={(e) => updateLine(idx, 'accountId', e.target.value)}
                            className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-xs"
                          >
                            <option value="">Default</option>
                            {leafAccounts.map((a) => (
                              <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(idx, 'description', e.target.value)}
                            className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min={0.01}
                            step="any"
                            value={line.quantity}
                            onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-16 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-xs text-right"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={line.rate}
                            onChange={(e) => updateLine(idx, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-xs text-right"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={line.taxRate}
                            onChange={(e) => updateLine(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-16 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-xs text-right"
                          />
                        </td>
                        <td className="px-2 py-1 text-right font-mono">{format(amt)}</td>
                        <td className="px-2 py-1">
                          <button
                            type="button"
                            className="text-red-500 hover:underline text-xs"
                            onClick={() => removeLine(idx)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-4 mt-2 text-xs font-mono">
              <span>Subtotal: {format(subtotal)}</span>
              <span>Tax: {format(tax)}</span>
              <span className="font-semibold">Total: {format(total)}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
              onClick={createInvoice}
            >
              Create Invoice
            </button>
            <button
              type="button"
              className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)]"
              onClick={() => {
                setShowForm(false);
                setForm({
                  date: new Date().toISOString().slice(0, 10),
                  dueDate: '',
                  customerId: '',
                  description: '',
                  terms: '',
                  lines: [emptyLine()],
                });
              }}
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
              <th className="px-4 py-2 text-left">Invoice #</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Lines</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const status = inv.status as InvoiceStatus;
              return (
                <tr key={inv.id} className="border-b border-[var(--border)]">
                  <td className="px-4 py-2 font-mono">{inv.invoiceNo}</td>
                  <td className="px-4 py-2">{inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-2">{inv.customer?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-2 text-xs text-[var(--muted-foreground)]">{inv.lines?.length ?? 0} items</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {status === 'DRAFT' && (
                      <>
                        <button
                          type="button"
                          className="mr-2 text-xs text-[var(--primary)] hover:underline"
                          onClick={() => postInvoice(inv.id)}
                        >
                          Post
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-500 hover:underline"
                          onClick={() => setConfirmDeleteId(inv.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {(status === 'UNPAID' || status === 'PARTIALLY_PAID') && (
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => setConfirmDeleteId(inv.id)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && invoices.length === 0 && !error && (
        <p className="text-[var(--muted-foreground)]">
          No sales invoices yet. Click &quot;+ New Invoice&quot; to create one.
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
              ? {invoices.find((i) => i.id === confirmDeleteId)?.status !== 'DRAFT'
                  ? 'The journal entry will be reversed.'
                  : 'This cannot be undone.'}
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
