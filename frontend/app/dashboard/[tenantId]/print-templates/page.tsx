'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, PrintTemplate } from '@/lib/api';

export default function PrintTemplatesPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    setLoading(true);
    api<PrintTemplate[]>(`/tenants/${tenantId}/print-templates`, { token })
      .then((data) => {
        setTemplates(data);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  function refresh() {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    api<PrintTemplate[]>(`/tenants/${tenantId}/print-templates`, { token })
      .then((data) => {
        setTemplates(data);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }

  async function setDefault(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await api(`/tenants/${tenantId}/print-templates/${id}/set-default`, {
        method: 'POST',
        token,
      });
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set default');
    }
  }

  async function duplicate(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const created = await api<PrintTemplate>(`/tenants/${tenantId}/print-templates/${id}/duplicate`, {
        method: 'POST',
        token,
      });
      router.push(`/dashboard/${tenantId}/print-templates/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to duplicate');
    }
  }

  async function remove(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api(`/tenants/${tenantId}/print-templates/${id}`, {
        method: 'DELETE',
        token,
      });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Print Templates</h1>
        <Link
          href={`/dashboard/${tenantId}/print-templates/new`}
          className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
        >
          New Template
        </Link>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading ? (
        <p className="text-[var(--muted-foreground)]">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="px-4 py-2 text-left">Template Name</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Is Default</th>
                <th className="px-4 py-2 text-left">Is Custom</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id} className="border-b border-[var(--border)]">
                  <td className="px-4 py-2">
                    <button
                      className="text-[var(--primary)] hover:underline"
                      onClick={() => router.push(`/dashboard/${tenantId}/print-templates/${tpl.id}`)}
                    >
                      {tpl.name}
                    </button>
                  </td>
                  <td className="px-4 py-2">{tpl.type.replace('_', ' ')}</td>
                  <td className="px-4 py-2">{tpl.isDefault ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">{tpl.isCustom ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 text-right space-x-3">
                    {!tpl.isDefault && (
                      <button
                        onClick={() => setDefault(tpl.id)}
                        className="text-xs text-[var(--primary)] hover:underline"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => duplicate(tpl.id)}
                      className="text-xs text-[var(--muted-foreground)] hover:underline"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => remove(tpl.id)}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                      disabled={!tpl.isCustom}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

