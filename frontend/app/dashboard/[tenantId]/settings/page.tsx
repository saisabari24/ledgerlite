'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Tenant } from '@/lib/api';

export default function SettingsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    gstin: '',
    pan: '',
    currency: 'INR',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    tenantEmail: '',
    termsAndConditions: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIfsc: '',
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    load(token);
  }, [tenantId]);

  async function load(token: string) {
    try {
      const tenant = await api<Tenant>(`/tenants/${tenantId}`, { token });
      setForm({
        name: tenant.name ?? '',
        gstin: tenant.gstin ?? '',
        pan: tenant.pan ?? '',
        currency: tenant.currency ?? 'INR',
        address: tenant.address ?? '',
        city: tenant.city ?? '',
        state: tenant.state ?? '',
        pincode: tenant.pincode ?? '',
        phone: tenant.phone ?? '',
        tenantEmail: tenant.tenantEmail ?? '',
        termsAndConditions: tenant.termsAndConditions ?? '',
        bankName: tenant.bankName ?? '',
        bankAccountName: tenant.bankAccountName ?? '',
        bankAccountNumber: tenant.bankAccountNumber ?? '',
        bankIfsc: tenant.bankIfsc ?? '',
      });
      if (tenant.logoUrl) setLogoUrl(`/tenants/${tenantId}/logo`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api(`/tenants/${tenantId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(form),
      });
      setSuccess('Settings saved successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch(`http://localhost:3001/tenants/${tenantId}/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(err.message ?? 'Upload failed');
      }
      setLogoUrl(`/tenants/${tenantId}/logo?_t=${Date.now()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveLogo() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await api(`/tenants/${tenantId}/logo`, { method: 'DELETE', token });
      setLogoUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold">Settings</h1>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button type="button" className="ml-2 font-medium hover:underline" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="rounded border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Company Profile */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-base font-semibold">Company Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Company Name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Address</label>
            <input value={form.address} onChange={(e) => set('address', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">City</label>
            <input value={form.city} onChange={(e) => set('city', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">State</label>
            <input value={form.state} onChange={(e) => set('state', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Pincode</label>
            <input value={form.pincode} onChange={(e) => set('pincode', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Currency</label>
            <input value={form.currency} onChange={(e) => set('currency', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">GSTIN</label>
            <input value={form.gstin} onChange={(e) => set('gstin', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium">PAN</label>
            <input value={form.pan} onChange={(e) => set('pan', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input type="email" value={form.tenantEmail} onChange={(e) => set('tenantEmail', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
        </div>
      </section>

      {/* Logo */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-base font-semibold">Company Logo</h2>
        <div className="flex items-start gap-6">
          <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-[var(--muted-foreground)]">No logo</span>
            )}
          </div>
          <div className="space-y-2">
            <label className="inline-block cursor-pointer rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90">
              {uploading ? 'Uploading...' : 'Upload Logo'}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
            {logoUrl && (
              <button
                type="button"
                className="block text-xs text-red-500 hover:underline"
                onClick={handleRemoveLogo}
              >
                Remove Logo
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Bank Details */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-base font-semibold">Bank Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Bank Name</label>
            <input value={form.bankName} onChange={(e) => set('bankName', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Account Holder Name</label>
            <input value={form.bankAccountName} onChange={(e) => set('bankAccountName', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Account Number</label>
            <input value={form.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium">IFSC Code</label>
            <input value={form.bankIfsc} onChange={(e) => set('bankIfsc', e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono" />
          </div>
        </div>
      </section>

      {/* Terms & Conditions */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-base font-semibold">Default Terms &amp; Conditions</h2>
        <p className="mb-2 text-xs text-[var(--muted-foreground)]">
          This text appears in print templates as default terms. You can override it per document.
        </p>
        <textarea
          value={form.termsAndConditions}
          onChange={(e) => set('termsAndConditions', e.target.value)}
          rows={6}
          className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          className="rounded bg-[var(--primary)] px-6 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
