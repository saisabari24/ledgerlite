'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, PrintTemplate } from '@/lib/api';

const PLACEHOLDER_GROUPS = [
  {
    label: 'Settings',
    items: [
      { token: '{{settings.name}}', desc: 'Company name' },
      { token: '{{settings.address}}', desc: 'Company address' },
      { token: '{{settings.gstin}}', desc: 'GSTIN' },
      { token: '{{settings.pan}}', desc: 'PAN' },
      { token: '{{settings.phone}}', desc: 'Phone' },
      { token: '{{settings.email}}', desc: 'Email' },
      { token: '{{settings.logoUrl}}', desc: 'Logo URL' },
      { token: '{{settings.currency}}', desc: 'Currency' },
      { token: '{{settings.terms}}', desc: 'Default terms & conditions' },
      { token: '{{settings.bankName}}', desc: 'Bank name' },
      { token: '{{settings.bankAccountName}}', desc: 'Bank account holder' },
      { token: '{{settings.bankAccountNumber}}', desc: 'Bank account number' },
      { token: '{{settings.bankIfsc}}', desc: 'IFSC code' },
    ],
  },
  {
    label: 'Document',
    items: [
      { token: '{{doc.number}}', desc: 'Document number' },
      { token: '{{doc.date}}', desc: 'Document date' },
      { token: '{{doc.title}}', desc: 'Document title' },
      { token: '{{doc.type_label}}', desc: 'Document type label' },
      { token: '{{doc.terms}}', desc: 'Document terms' },
    ],
  },
  {
    label: 'Party',
    items: [
      { token: '{{party.name}}', desc: 'Party name' },
      { token: '{{party.address}}', desc: 'Party address' },
      { token: '{{party.gstin}}', desc: 'Party GSTIN' },
    ],
  },
  {
    label: 'Lines',
    items: [
      { token: '{{#each lines}}...{{/each}}', desc: 'Lines loop block' },
      { token: '{{index}}', desc: 'Line number' },
      { token: '{{line.description}}', desc: 'Line description' },
      { token: '{{line.qty}}', desc: 'Quantity' },
      { token: '{{line.rate}}', desc: 'Rate' },
      { token: '{{line.amount}}', desc: 'Amount' },
    ],
  },
  {
    label: 'Totals',
    items: [
      { token: '{{totals.subtotal}}', desc: 'Subtotal' },
      { token: '{{totals.tax}}', desc: 'Tax' },
      { token: '{{totals.total}}', desc: 'Total' },
    ],
  },
];

const DEFAULT_BODY = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>{{doc.title}}</title></head>
<body style="margin:0;padding:40px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#1e293b;line-height:1.5;">
  <div style="background:linear-gradient(135deg,#1e293b,#334155);margin:-40px -40px 32px;padding:32px 40px;color:#fff;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td>
          <img src="{{settings.logoUrl}}" style="max-height:48px;max-width:140px;margin-bottom:8px;display:block;" />
          <h1 style="margin:0;font-size:22px;font-weight:700;">{{settings.name}}</h1>
          <p style="margin:4px 0 0;color:#cbd5e1;white-space:pre-line;">{{settings.address}}</p>
          <p style="margin:2px 0 0;color:#94a3b8;">GSTIN: {{settings.gstin}} | {{settings.phone}}</p>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;">{{doc.type_label}}</p>
          <p style="margin:6px 0 0;font-size:18px;font-weight:700;">#{{doc.number}}</p>
          <p style="margin:2px 0 0;color:#cbd5e1;">Date: {{doc.date}}</p>
        </td>
      </tr>
    </table>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr>
      <td style="vertical-align:top;width:50%;background:#f8fafc;padding:16px;border-radius:8px;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;">Bill To</p>
        <p style="margin:6px 0 0;font-weight:600;font-size:14px;">{{party.name}}</p>
        <p style="margin:2px 0 0;color:#475569;">{{party.address}}</p>
        <p style="margin:2px 0 0;color:#475569;">GSTIN: {{party.gstin}}</p>
      </td>
      <td style="width:16px;"></td>
      <td style="vertical-align:top;width:50%;background:#f8fafc;padding:16px;border-radius:8px;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;">Company Info</p>
        <p style="margin:6px 0 0;color:#475569;">Email: {{settings.email}}</p>
        <p style="margin:2px 0;color:#475569;">PAN: {{settings.pan}}</p>
        <p style="margin:2px 0 0;color:#475569;">Currency: {{settings.currency}}</p>
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;">
    <thead>
      <tr style="background:#1e293b;color:#fff;">
        <th style="padding:10px 8px;text-align:left;font-weight:500;">#</th>
        <th style="padding:10px 8px;text-align:left;font-weight:500;">Item</th>
        <th style="padding:10px 8px;text-align:right;font-weight:500;">Qty</th>
        <th style="padding:10px 8px;text-align:right;font-weight:500;">Rate</th>
        <th style="padding:10px 8px;text-align:right;font-weight:500;">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each lines}}
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 8px;color:#64748b;">{{index}}</td>
        <td style="padding:10px 8px;">{{line.description}}</td>
        <td style="padding:10px 8px;text-align:right;">{{line.qty}}</td>
        <td style="padding:10px 8px;text-align:right;">{{line.rate}}</td>
        <td style="padding:10px 8px;text-align:right;font-weight:600;">{{line.amount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div style="margin-left:auto;width:280px;background:#f8fafc;border-radius:8px;padding:16px;">
    <table style="width:100%;font-size:13px;">
      <tr><td style="padding:4px 0;color:#64748b;">Subtotal</td><td style="padding:4px 0;text-align:right;font-weight:500;">{{totals.subtotal}}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Tax</td><td style="padding:4px 0;text-align:right;font-weight:500;">{{totals.tax}}</td></tr>
      <tr><td style="padding:8px 0 0;font-weight:700;font-size:15px;border-top:2px solid #1e293b;">Total</td><td style="padding:8px 0 0;text-align:right;font-weight:700;font-size:15px;border-top:2px solid #1e293b;">{{totals.total}}</td></tr>
    </table>
  </div>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;" />

  <table style="width:100%;font-size:12px;">
    <tr>
      <td style="vertical-align:top;width:50%;padding-right:16px;">
        <p style="margin:0;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-size:11px;">Bank Details</p>
        <p style="margin:4px 0 0;color:#475569;">{{settings.bankAccountName}}</p>
        <p style="margin:2px 0;color:#475569;">A/C: {{settings.bankAccountNumber}}</p>
        <p style="margin:2px 0;color:#475569;">IFSC: {{settings.bankIfsc}}</p>
        <p style="margin:2px 0 0;color:#475569;">{{settings.bankName}}</p>
      </td>
      <td style="vertical-align:top;width:50%;padding-left:16px;">
        <p style="margin:0;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-size:11px;">Terms &amp; Conditions</p>
        <p style="margin:4px 0 0;color:#94a3b8;white-space:pre-line;">{{settings.terms}}</p>
      </td>
    </tr>
  </table>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
  <p style="margin:0;text-align:center;font-size:11px;color:#94a3b8;">This is a computer-generated document. {{settings.name}}</p>
</body>
</html>`.trim();

const SAMPLE = {
  settings: {
    name: 'ABC Pvt Ltd',
    address: '123 MG Road\nBengaluru, KA\n560001',
    gstin: '29AABCU9603R1ZM',
    pan: 'AABCP1234F',
    phone: '+91 9876543210',
    email: 'hello@abc.in',
    logoUrl: '',
    terms: 'Payment due within 15 days.\nThank you for your business.',
    currency: 'INR',
    bankName: 'State Bank of India',
    bankAccountName: 'ABC Pvt Ltd',
    bankAccountNumber: '1234567890123456',
    bankIfsc: 'SBIN0001234',
  },
  doc: { title: 'Sales Invoice', type_label: 'Sales Invoice', number: 'INV-0001', date: '2026-04-01', terms: 'Payment due within 15 days.\nThank you for your business.' },
  party: { name: 'Sample Customer', address: '42 Residency Road, Bengaluru, KA 560025', gstin: '29AAACB1234F1Z5' },
  lines: [
    { index: 1, description: 'Consulting services', qty: 10, rate: 1500, amount: 15000 },
    { index: 2, description: 'Implementation support', qty: 5, rate: 2000, amount: 10000 },
  ],
  totals: { subtotal: 25000, tax: 4500, total: 29500 },
};

function injectSamplePlaceholders(html: string): string {
  let out = html;

  // {{settings.*}} and {{company.*}} → settings
  out = out.replace(/\{\{(settings|company)\.([^}]+)\}\}/g, (_m: string, _ns: string, key: string) => {
    const val = (SAMPLE.settings as any)[key.trim()];
    return val !== undefined && val !== null ? String(val) : _m;
  });

  // {{party.*}}
  out = out.replace(/\{\{party\.([^}]+)\}\}/g, (_m: string, key: string) => {
    const val = (SAMPLE.party as any)[key.trim()];
    return val !== undefined && val !== null ? String(val) : _m;
  });

  // {{doc.*}}
  out = out.replace(/\{\{doc\.([^}]+)\}\}/g, (_m: string, key: string) => {
    const val = (SAMPLE.doc as any)[key.trim()];
    return val !== undefined && val !== null ? String(val) : _m;
  });

  // {{totals.*}}
  out = out.replace(/\{\{totals\.([^}]+)\}\}/g, (_m: string, key: string) => {
    const val = (SAMPLE.totals as any)[key.trim()];
    return val !== undefined && val !== null ? String(val) : _m;
  });

  // {{#each lines}}...{{/each}}
  out = out.replace(/\{\{#each lines\}\}([\s\S]*?)\{\{\/each\}\}/g, (_m: string, block: string) => {
    return SAMPLE.lines.map((line) => {
      let row = block;
      row = row.replace(/\{\{index\}\}/g, String(line.index));
      row = row.replace(/\{\{line\.([^}]+)\}\}/g, (_m2: string, key: string) => {
        const val = (line as any)[key.trim()];
        return val !== undefined && val !== null ? String(val) : _m2;
      });
      return row;
    }).join('');
  });

  return out;
}

export default function PrintTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const templateId = params.templateId as string;
  const isNew = templateId === 'new';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [template, setTemplate] = useState<PrintTemplate | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PrintTemplate['type']>('SALES_INVOICE');
  const [body, setBody] = useState(() => isNew ? DEFAULT_BODY : '');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPlaceholders, setShowPlaceholders] = useState(false);

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

  const insertPlaceholder = useCallback((token: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = body.slice(0, start);
    const after = body.slice(end);
    const newBody = before + token + after;
    setBody(newBody);
    // Restore cursor position after token
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
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
            Use {'{{placeholder}}'} tokens to inject dynamic data. Settings are pulled from the{' '}
            <a href={`/dashboard/${tenantId}/settings`} className="text-[var(--primary)] hover:underline">Company Settings</a> page.
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
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">HTML Source</label>
              <div className="relative">
                <button
                  type="button"
                  className="text-xs text-[var(--primary)] hover:underline"
                  onClick={() => setShowPlaceholders(!showPlaceholders)}
                >
                  {showPlaceholders ? 'Hide' : 'Insert'} Placeholder
                </button>
                {showPlaceholders && (
                  <div className="absolute right-0 top-6 z-10 w-64 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
                    {PLACEHOLDER_GROUPS.map((group) => (
                      <div key={group.label} className="mb-2">
                        <p className="mb-1 text-xs font-semibold text-[var(--muted-foreground)]">{group.label}</p>
                        {group.items.map((item) => (
                          <button
                            key={item.token}
                            type="button"
                            className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--muted)]"
                            onClick={() => { insertPlaceholder(item.token); setShowPlaceholders(false); }}
                            title={item.desc}
                          >
                            <code className="text-[var(--primary)]">{item.token}</code>
                            <span className="ml-1 text-[var(--muted-foreground)]">{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <textarea
              ref={textareaRef}
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

