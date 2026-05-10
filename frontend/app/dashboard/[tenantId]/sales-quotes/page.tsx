'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, SalesQuote, Customer, Item } from '@/lib/api';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  SENT: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
};

type QuoteLine = {
  itemId: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
};

function emptyLine(): QuoteLine {
  return { itemId: '', description: '', quantity: 1, rate: 0, taxRate: 0 };
}

export default function SalesQuotesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [quotes, setQuotes] = useState<SalesQuote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLines, setFormLines] = useState<QuoteLine[]>([emptyLine()]);

  useEffect(() => {
    setFormDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    loadAll(token);
  }, [tenantId]);

  async function loadAll(token: string) {
    await Promise.all([
      loadQuotes(token),
      loadCustomers(token),
      loadItems(token),
    ]);
  }

  async function loadQuotes(token: string) {
    try {
      const list = await api<SalesQuote[]>(`/tenants/${tenantId}/sales/quotes`, { token });
      setQuotes(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quotes');
    }
  }

  async function loadCustomers(token: string) {
    try {
      const list = await api<Customer[]>(`/tenants/${tenantId}/customers`, { token });
      setCustomers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers');
    }
  }

  async function loadItems(token: string) {
    try {
      const list = await api<Item[]>(`/tenants/${tenantId}/inventory/items`, { token });
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items');
    }
  }

  async function handleCreate() {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!formDate || !formCustomerId) {
      setError('Date and customer are required');
      return;
    }
    const validLines = formLines.filter((l) => l.itemId && l.quantity > 0);
    if (validLines.length === 0) {
      setError('At least one line item is required');
      return;
    }
    try {
      await api<SalesQuote>(`/tenants/${tenantId}/sales/quotes`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          date: formDate,
          customerId: formCustomerId,
          description: formDescription.trim() || undefined,
          lines: validLines.map((l) => ({
            itemId: l.itemId,
            description: l.description.trim() || undefined,
            quantity: l.quantity,
            rate: l.rate,
            taxRate: l.taxRate,
          })),
        }),
      });
      setShowForm(false);
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormCustomerId('');
      setFormDescription('');
      setFormLines([emptyLine()]);
      setError('');
      await loadQuotes(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setConfirmDeleteId(null);
    try {
      await api(`/tenants/${tenantId}/sales/quotes/${id}`, { method: 'DELETE', token });
      setError('');
      await loadQuotes(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  function updateLine(index: number, field: keyof QuoteLine, value: string | number) {
    setFormLines((prev) => {
      const next = prev.map((l, i) => (i === index ? { ...l, [field]: value } : l));
      if (field === 'itemId' && typeof value === 'string') {
        const item = items.find((it) => it.id === value);
        if (item) {
          next[index].rate = item.rate;
          next[index].taxRate = item.taxRate;
        }
      }
      return next;
    });
  }

  function addLine() {
    setFormLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setFormLines((prev) => prev.filter((_, i) => i !== index));
  }

  const lineAmount = (l: QuoteLine) => l.quantity * l.rate;
  const subtotal = formLines.reduce((s, l) => s + lineAmount(l), 0);
  const tax = formLines.reduce((s, l) => s + lineAmount(l) * l.taxRate / 100, 0);
  const total = subtotal + tax;

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sales Quotes</h1>
        <button
          type="button"
          className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancel' : '+ New Quote'}
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

      {showForm && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]/40 p-4 space-y-3">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--muted-foreground)]">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--muted-foreground)]">Customer</label>
              <select
                value={formCustomerId}
                onChange={(e) => setFormCustomerId(e.target.value)}
                className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              >
                <option value="">-- Select --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-[var(--muted-foreground)]">Description</label>
              <input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-[var(--border)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="px-2 py-1 text-left">Item</th>
                  <th className="px-2 py-1 text-left">Description</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-right">Rate</th>
                  <th className="px-2 py-1 text-right">Tax %</th>
                  <th className="px-2 py-1 text-right">Amount</th>
                  <th className="px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {formLines.map((line, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    <td className="px-2 py-1">
                      <select
                        value={line.itemId}
                        onChange={(e) => updateLine(i, 'itemId', e.target.value)}
                        className="w-28 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-xs"
                      >
                        <option value="">--</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>{it.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        value={line.description}
                        onChange={(e) => updateLine(i, 'description', e.target.value)}
                        placeholder="Line desc"
                        className="w-28 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={line.quantity}
                        onChange={(e) => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-16 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-right text-xs"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={line.rate}
                        onChange={(e) => updateLine(i, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-right text-xs"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={line.taxRate}
                        onChange={(e) => updateLine(i, 'taxRate', parseFloat(e.target.value) || 0)}
                        className="w-16 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-right text-xs"
                      />
                    </td>
                    <td className="px-2 py-1 text-right font-mono">
                      {formatAmount(lineAmount(line))}
                    </td>
                    <td className="px-2 py-1">
                      {formLines.length > 1 && (
                        <button
                          type="button"
                          className="text-red-500 hover:underline text-xs"
                          onClick={() => removeLine(i)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--border)] font-medium">
                  <td colSpan={5} className="px-2 py-1 text-right">Subtotal</td>
                  <td className="px-2 py-1 text-right font-mono">{formatAmount(subtotal)}</td>
                  <td />
                </tr>
                <tr className="font-medium">
                  <td colSpan={5} className="px-2 py-1 text-right">Tax</td>
                  <td className="px-2 py-1 text-right font-mono">{formatAmount(tax)}</td>
                  <td />
                </tr>
                <tr className="border-t border-[var(--border)] font-semibold">
                  <td colSpan={5} className="px-2 py-1 text-right">Total</td>
                  <td className="px-2 py-1 text-right font-mono">{formatAmount(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-medium hover:bg-[var(--muted)]"
              onClick={addLine}
            >
              + Add line
            </button>
            <button
              type="button"
              className="rounded bg-[var(--primary)] px-3 py-1 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
              onClick={handleCreate}
            >
              Save Quote
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-2 text-left">Quote #</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2 font-mono text-xs">{q.quoteNo}</td>
                <td className="px-4 py-2">{q.date}</td>
                <td className="px-4 py-2">{q.customer?.name ?? '-'}</td>
                <td className="px-4 py-2 text-right font-mono">
                  {formatAmount(Number(q.total))}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[q.status] ?? 'bg-gray-100 text-gray-800'}`}>
                    {q.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => setConfirmDeleteId(q.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {quotes.length === 0 && !error && (
        <p className="text-sm text-[var(--muted-foreground)]">
          No sales quotes yet. Click &quot;+ New Quote&quot; to create one.
        </p>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg">
            <p className="mb-1 text-sm text-[var(--muted-foreground)]">Delete sales quote</p>
            <p className="mb-4 font-medium">
              Delete{' '}
              <span className="text-red-500">
                {quotes.find((q) => q.id === confirmDeleteId)?.quoteNo}
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
                onClick={() => handleDelete(confirmDeleteId)}
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
