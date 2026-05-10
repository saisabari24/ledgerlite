'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, PurchasePayment, Supplier, Account, PurchaseInvoice } from '@/lib/api';

type PaymentWithAlloc = PurchasePayment & { journalEntryId: string | null };

export default function PurchasePaymentsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [payments, setPayments] = useState<PaymentWithAlloc[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [leafAccounts, setLeafAccounts] = useState<Account[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [error, setError] = useState('');

  const [showNewForm, setShowNewForm] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formMode, setFormMode] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    loadAll(token);
  }, [tenantId]);

  async function loadAll(token?: string) {
    const t = token ?? localStorage.getItem('token');
    if (!t) return;
    try {
      const [paymentsData, suppliersData, accountsData, invoicesData] = await Promise.all([
        api<PaymentWithAlloc[]>(`/tenants/${tenantId}/purchases/payments`, { token: t }),
        api<Supplier[]>(`/tenants/${tenantId}/suppliers`, { token: t }),
        api<Account[]>(`/tenants/${tenantId}/accounts`, { token: t }),
        api<PurchaseInvoice[]>(`/tenants/${tenantId}/purchases/invoices`, { token: t }),
      ]);
      setPayments(paymentsData);
      setSuppliers(suppliersData);
      setLeafAccounts(accountsData.filter((a) => !a.isGroup));
      setInvoices(invoicesData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }

  async function createPayment() {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!formDate || !formSupplierId || !formMode || !formAmount) {
      setError('Date, Supplier, Mode, and Amount are required');
      return;
    }
    try {
      const body: Record<string, unknown> = {
        date: formDate,
        supplierId: formSupplierId,
        mode: formMode,
        amount: parseFloat(formAmount),
      };
      if (formReference.trim()) body.reference = formReference.trim();
      if (formAccountId) body.accountId = formAccountId;

      const allocs = Object.entries(allocations)
        .filter(([, amt]) => amt && parseFloat(amt) > 0)
        .map(([invId, amt]) => ({ invoiceId: invId, amount: parseFloat(amt) }));
      if (allocs.length) body.allocations = allocs;

      await api(`/tenants/${tenantId}/purchases/payments`, {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });

      setShowNewForm(false);
      setFormDate('');
      setFormSupplierId('');
      setFormMode('');
      setFormReference('');
      setFormAmount('');
      setFormAccountId('');
      setAllocations({});
      setError('');
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  async function postPayment(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await api(`/tenants/${tenantId}/purchases/payments/${id}/post`, { method: 'POST', token });
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Post failed');
    }
  }

  async function deletePayment(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setConfirmDeleteId(null);
    try {
      await api(`/tenants/${tenantId}/purchases/payments/${id}`, { method: 'DELETE', token });
      setError('');
      await loadAll(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const unpaidInvoices = invoices.filter(
    (inv) =>
      inv.supplierId === formSupplierId &&
      (inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID'),
  );

  const formatAmount = (n: number | string) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      Number(n),
    );

  function resetForm() {
    setFormDate('');
    setFormSupplierId('');
    setFormMode('');
    setFormReference('');
    setFormAmount('');
    setFormAccountId('');
    setAllocations({});
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Purchase Payments</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Payments made to suppliers against purchase invoices.
          </p>
        </div>
        <button
          type="button"
          className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
          onClick={() => {
            setShowNewForm(true);
            resetForm();
          }}
        >
          + New Payment
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
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Payment No</th>
              <th className="px-4 py-2 text-left">Supplier</th>
              <th className="px-4 py-2 text-left">Mode</th>
              <th className="px-4 py-2 text-left">Reference</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Against</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {showNewForm && (
              <tr className="border-b border-[var(--border)] bg-[var(--card)]/40">
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-2 text-xs text-[var(--muted-foreground)]">Auto</td>
                <td className="px-4 py-2">
                  <select
                    value={formSupplierId}
                    onChange={(e) => {
                      setFormSupplierId(e.target.value);
                      setAllocations({});
                    }}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    placeholder="Mode"
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    placeholder="Reference"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-2" colSpan={2}>
                  <div className="flex items-center gap-2">
                    <select
                      value={formAccountId}
                      onChange={(e) => setFormAccountId(e.target.value)}
                      className="flex-1 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    >
                      <option value="">Bank / Cash account</option>
                      {leafAccounts
                        .filter((a) => a.type === 'ASSET')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className="rounded bg-[var(--primary)] px-3 py-1 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
                      onClick={createPayment}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="text-xs text-[var(--muted-foreground)] hover:underline"
                      onClick={() => {
                        setShowNewForm(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {showNewForm && formSupplierId && unpaidInvoices.length > 0 && (
              <tr className="border-b border-[var(--border)] bg-[var(--card)]/20">
                <td className="px-4 py-2" colSpan={8}>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[var(--muted-foreground)]">
                      Allocate to invoices
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {unpaidInvoices.map((inv) => (
                        <div key={inv.id} className="flex items-center gap-1">
                          <span className="text-xs">{inv.invoiceNo}</span>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            ({formatAmount(inv.total)})
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Alloc"
                            value={allocations[inv.id] ?? ''}
                            onChange={(e) =>
                              setAllocations((prev) => ({
                                ...prev,
                                [inv.id]: e.target.value,
                              }))
                            }
                            className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {payments.map((p) => {
              const isPosted = !!p.journalEntryId;
              const against =
                p.allocations.length > 0
                  ? p.allocations
                      .map((a) => a.purchaseInvoice.invoiceNo)
                      .join(', ')
                  : '—';

              return (
                <tr key={p.id} className="border-b border-[var(--border)]">
                  <td className="px-4 py-2">{p.date.slice(0, 10)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.paymentNo}</td>
                  <td className="px-4 py-2">{p.supplier.name}</td>
                  <td className="px-4 py-2">{p.mode}</td>
                  <td className="px-4 py-2 text-[var(--muted-foreground)]">
                    {p.reference ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatAmount(p.amount)}
                  </td>
                  <td className="px-4 py-2 text-xs">{against}</td>
                  <td className="px-4 py-2 text-right">
                    {!isPosted ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="text-xs text-[var(--primary)] hover:underline"
                          onClick={() => postPayment(p.id)}
                        >
                          Post
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

      {payments.length === 0 && !error && (
        <p className="text-sm text-[var(--muted-foreground)]">
          No payments yet. Click &quot;+ New Payment&quot; to record one.
        </p>
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
