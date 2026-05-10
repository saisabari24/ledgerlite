'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, SalesPayment, Customer, Account, SalesInvoice } from '@/lib/api';

type PaymentWithJournal = SalesPayment & { journalEntryId?: string | null };

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

const today = () => new Date().toISOString().split('T')[0];

export default function SalesPaymentsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [payments, setPayments] = useState<PaymentWithJournal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formDate, setFormDate] = useState(today());
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formMode, setFormMode] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formAllocations, setFormAllocations] = useState<{ invoiceId: string; amount: string }[]>([]);
  const [postingId, setPostingId] = useState<string | null>(null);

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
      const [paymentsData, customersData, accountsData, invoicesData] = await Promise.all([
        api<PaymentWithJournal[]>(`/tenants/${tenantId}/sales/payments`, { token: t }),
        api<Customer[]>(`/tenants/${tenantId}/customers`, { token: t }),
        api<Account[]>(`/tenants/${tenantId}/accounts`, { token: t }),
        api<SalesInvoice[]>(`/tenants/${tenantId}/sales/invoices`, { token: t }),
      ]);
      setPayments(paymentsData);
      setCustomers(customersData);
      setAccounts(accountsData);
      setInvoices(invoicesData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormDate(today());
    setFormCustomerId('');
    setFormMode('');
    setFormReference('');
    setFormAmount('');
    setFormAccountId('');
    setFormAllocations([]);
  }

  async function createPayment() {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!formDate || !formCustomerId || !formMode || !formAmount) {
      setError('Date, customer, mode, and amount are required');
      return;
    }
    try {
      await api(`/tenants/${tenantId}/sales/payments`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          date: formDate,
          customerId: formCustomerId,
          mode: formMode,
          reference: formReference || undefined,
          amount: Number(formAmount),
          accountId: formAccountId || undefined,
          allocations: formAllocations
            .filter((a) => a.invoiceId && a.amount)
            .map((a) => ({ invoiceId: a.invoiceId, amount: Number(a.amount) })),
        }),
      });
      setShowForm(false);
      resetForm();
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  async function postPayment(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setPostingId(id);
    try {
      await api(`/tenants/${tenantId}/sales/payments/${id}/post`, { method: 'POST', token });
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Post failed');
    } finally {
      setPostingId(null);
    }
  }

  async function deletePayment(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setConfirmDeleteId(null);
    try {
      await api(`/tenants/${tenantId}/sales/payments/${id}`, { method: 'DELETE', token });
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const leafAccounts = accounts.filter((a) => !a.isGroup);
  const bankAccounts = leafAccounts.filter((a) => a.type === 'ASSET');

  const unpaidInvoices = invoices.filter(
    (inv) => inv.customerId === formCustomerId && inv.status !== 'PAID' && inv.status !== 'DRAFT',
  );

  function addAllocRow() {
    setFormAllocations((prev) => [...prev, { invoiceId: '', amount: '' }]);
  }

  function updateAlloc(idx: number, field: 'invoiceId' | 'amount', value: string) {
    setFormAllocations((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }

  function removeAlloc(idx: number) {
    setFormAllocations((prev) => prev.filter((_, i) => i !== idx));
  }

  const postedPayments = payments.filter((p) => p.journalEntryId);
  const unpostedPayments = payments.filter((p) => !p.journalEntryId);

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[var(--muted-foreground)]">Loading payments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sales Payments</h1>
        {!showForm && (
          <button
            type="button"
            className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + New Payment
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
          <h2 className="text-sm font-semibold">New Payment</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Customer</label>
              <select
                value={formCustomerId}
                onChange={(e) => setFormCustomerId(e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Mode</label>
              <input
                type="text"
                value={formMode}
                onChange={(e) => setFormMode(e.target.value)}
                placeholder="e.g. Bank Transfer"
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Reference</label>
              <input
                type="text"
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Bank Account</label>
              <select
                value={formAccountId}
                onChange={(e) => setFormAccountId(e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
              >
                <option value="">Select account</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {formCustomerId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Allocations</span>
                <button
                  type="button"
                  className="text-xs text-[var(--primary)] hover:underline"
                  onClick={addAllocRow}
                >
                  + Add Invoice
                </button>
              </div>
              {formAllocations.length === 0 && (
                <p className="text-xs text-[var(--muted-foreground)]">No allocations. Payment will be recorded as unallocated.</p>
              )}
              {formAllocations.map((alloc, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={alloc.invoiceId}
                    onChange={(e) => updateAlloc(idx, 'invoiceId', e.target.value)}
                    className="flex-1 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  >
                    <option value="">Select invoice</option>
                    {unpaidInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNo} — {formatCurrency(Number(inv.total))}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={alloc.amount}
                    onChange={(e) => updateAlloc(idx, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="w-28 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => removeAlloc(idx)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
              onClick={createPayment}
            >
              Save Payment
            </button>
            <button
              type="button"
              className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)]"
              onClick={() => {
                setShowForm(false);
                resetForm();
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
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Payment No</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-left">Mode</th>
              <th className="px-4 py-2 text-left">Reference</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Allocated To</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const isUnposted = !p.journalEntryId;
              return (
                <tr key={p.id} className="border-b border-[var(--border)]">
                  <td className="px-4 py-2">{new Date(p.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.paymentNo}</td>
                  <td className="px-4 py-2">{p.customer?.name ?? '-'}</td>
                  <td className="px-4 py-2">{p.mode}</td>
                  <td className="px-4 py-2 text-[var(--muted-foreground)]">{p.reference ?? '-'}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(Number(p.amount))}</td>
                  <td className="px-4 py-2 text-xs text-[var(--muted-foreground)]">
                    {p.allocations && p.allocations.length > 0
                      ? p.allocations.map((a) => a.salesInvoice?.invoiceNo ?? a.salesInvoiceId).join(', ')
                      : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isUnposted ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="rounded bg-[var(--primary)] px-2 py-1 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
                          disabled={postingId === p.id}
                          onClick={() => postPayment(p.id)}
                        >
                          {postingId === p.id ? 'Posting...' : 'Post'}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-500 hover:underline"
                          onClick={() => setConfirmDeleteId(p.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">Posted</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {payments.length === 0 && !error && !loading && (
        <p className="text-[var(--muted-foreground)]">No sales payments yet. Create one using the "+ New Payment" button.</p>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg">
            <p className="mb-1 text-sm text-[var(--muted-foreground)]">Delete payment</p>
            <p className="mb-4 font-medium">
              Delete payment{' '}
              <span className="text-red-500">
                {payments.find((p) => p.id === confirmDeleteId)?.paymentNo}
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
                onClick={() => deletePayment(confirmDeleteId)}
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
