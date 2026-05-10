'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, PrintTemplate } from '@/lib/api';

const SAMPLE_DATA = {
  company: {
    name: 'ABC Pvt Ltd',
    address: '123 MG Road, Bengaluru, KA 560001',
    gstin: '29AABCU9603R1ZM',
  },
  party: {
    name: 'Sample Customer',
    address: '42 Residency Road, Bengaluru, KA 560025',
    gstin: '29AAACB1234F1Z5',
  },
  doc: {
    title: 'Sales Invoice',
    type_label: 'Sales Invoice',
    number: 'INV-0001',
    date: '2026-04-01',
    terms: 'Payment due within 15 days.\nThank you for your business.',
  },
  lines: [
    { index: 1, description: 'Consulting services', qty: 10, rate: 1500, amount: 15000 },
    { index: 2, description: 'Implementation support', qty: 5, rate: 2000, amount: 10000 },
  ],
  totals: {
    subtotal: 25000,
    tax: 4500,
    total: 29500,
  },
};

function injectSamplePlaceholders(html: string): string {
  // Very naive placeholder replacement for preview only.
  let out = html;
  const flat: Record<string, string | number> = {
    '{{company.name}}': SAMPLE_DATA.company.name,
    '{{company.address}}': SAMPLE_DATA.company.address,
    '{{company.gstin}}': SAMPLE_DATA.company.gstin,
    '{{party.name}}': SAMPLE_DATA.party.name,
    '{{party.address}}': SAMPLE_DATA.party.address,
    '{{party.gstin}}': SAMPLE_DATA.party.gstin,
    '{{doc.title}}': SAMPLE_DATA.doc.title,
    '{{doc.type_label}}': SAMPLE_DATA.doc.type_label,
    '{{doc.number}}': SAMPLE_DATA.doc.number,
    '{{doc.date}}': SAMPLE_DATA.doc.date,
    '{{doc.terms}}': SAMPLE_DATA.doc.terms,
    '{{totals.subtotal}}': SAMPLE_DATA.totals.subtotal,
    '{{totals.tax}}': SAMPLE_DATA.totals.tax,
    '{{totals.total}}': SAMPLE_DATA.totals.total,
  };

  for (const [key, value] of Object.entries(flat)) {
    out = out.replaceAll(key, String(value));
  }

  // Handle a very small subset of {{#each lines}} ... {{/each}}
  if (out.includes('{{#each lines}}')) {
    const start = out.indexOf('{{#each lines}}');
    const end = out.indexOf('{{/each}}', start);
    if (end > start) {
      const before = out.slice(0, start);
      const loopBlock = out.slice(start + '{{#each lines}}'.length, end);
      const after = out.slice(end + '{{/each}}'.length);

      const renderedLines = SAMPLE_DATA.lines
        .map((line) => {
          let row = loopBlock;
          row = row.replaceAll('{{index}}', String(line.index));
          row = row.replaceAll('{{line.description}}', line.description);
          row = row.replaceAll('{{line.qty}}', String(line.qty));
          row = row.replaceAll('{{line.rate}}', String(line.rate));
          row = row.replaceAll('{{line.amount}}', String(line.amount));
          return row;
        })
        .join('');

      out = before + renderedLines + after;
    }
  }

  return out;
}

export default function PrintTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const templateId = params.templateId as string;
  const isNew = templateId === 'new';

  const [template, setTemplate] = useState<PrintTemplate | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PrintTemplate['type']>('SALES_INVOICE');
  const [body, setBody] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) {
      setTemplate(null);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token || !tenantId || !templateId) return;

    setLoading(true);
    api<PrintTemplate[]>(`/tenants/${tenantId}/print-templates`, { token })
      .then((list) => {
        const tpl = list.find((t) => t.id === templateId) ?? null;
        if (tpl) {
          setTemplate(tpl);
          setName(tpl.name);
          setType(tpl.type);
          setBody(tpl.body);
          setIsDefault(tpl.isDefault);
        } else {
          setError('Template not found');
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [tenantId, templateId, isNew]);

  const previewHtml = useMemo(() => {
    if (!body) return '<p class="p-4 text-sm text-slate-500">No content yet.</p>';
    return injectSamplePlaceholders(body);
  }, [body]);

  async function save(asNew = false) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    setError('');

    const payload = {
      name,
      type,
      body,
      isDefault,
    };

    try {
      if (isNew || asNew) {
        const created = await api<PrintTemplate>(`/tenants/${tenantId}/print-templates`, {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
        router.replace(`/dashboard/${tenantId}/print-templates/${created.id}`);
      } else {
        await api<PrintTemplate>(`/tenants/${tenantId}/print-templates/${templateId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(payload),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function setAsDefault() {
    const token = localStorage.getItem('token');
    if (!token || isNew) return;
    try {
      await api(`/tenants/${tenantId}/print-templates/${templateId}/set-default`, {
        method: 'POST',
        token,
      });
      setIsDefault(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set default');
    }
  }

  if (loading) {
    return <p className="text-[var(--muted-foreground)]">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{isNew ? 'New Print Template' : 'Edit Print Template'}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            HTML templates with simple placeholders like {'{{company.name}}'}, {'{{doc.number}}'}, and {'{{totals.total}}'}.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PrintTemplate['type'])}
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="SALES_INVOICE">Sales Invoice</option>
                <option value="PURCHASE_INVOICE">Purchase Invoice</option>
                <option value="QUOTE">Quote</option>
                <option value="PAYMENT">Payment</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border border-[var(--border)]"
              />
              <span>Set as default for this document type</span>
            </label>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <label className="block text-sm font-medium">HTML Source</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={22}
              className="mt-1 w-full resize-y rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-mono"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="rounded border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--muted)] disabled:opacity-50"
            >
              Save As New
            </button>
            {!isNew && (
              <button
                onClick={setAsDefault}
                className="rounded border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--muted)]"
              >
                Set as Default
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-white">
          <div className="border-b border-[var(--border)] bg-[var(--muted)] px-4 py-2 text-xs font-medium text-[var(--muted-foreground)]">
            Preview (sample data)
          </div>
          <div className="h-[600px] overflow-auto bg-white">
            <iframe
              title="Print Template Preview"
              className="h-full w-full border-0"
              sandbox=""
              srcDoc={previewHtml}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

