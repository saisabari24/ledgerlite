'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api, Tenant, User } from '@/lib/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    const u = getUser();
    setUser(u);
    loadTenants(token, u);
  }, [router]);

  async function loadTenants(token: string, u: User | null) {
    if (!u) return;
    try {
      const list = await api<Tenant[]>('/tenants', { token });
      setTenants(list);
      if (u.role === 'BUSINESS' && u.tenantId) {
        setSelectedTenantId(u.tenantId);
      } else if (list.length > 0) {
        setSelectedTenantId(list[0].id);
      }
    } catch {
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }

  const tenantIdFromPath = pathname.match(/\/dashboard\/([^/]+)/)?.[1];
  const activeTenantId = tenantIdFromPath ?? selectedTenantId;

  const navSections =
    activeTenantId == null
      ? []
      : [
          {
            label: 'Dashboard',
            items: [
              {
                label: 'Dashboard',
                href: `/dashboard/${activeTenantId}`,
              },
            ],
          },
          {
            label: 'Sales',
            items: [
              {
                label: 'Sales Quotes',
                href: `/dashboard/${activeTenantId}/sales-quotes`,
              },
              {
                label: 'Sales Invoices',
                href: `/dashboard/${activeTenantId}/sales-invoices`,
              },
              {
                label: 'Sales Payments',
                href: `/dashboard/${activeTenantId}/sales-payments`,
              },
              {
                label: 'Customers',
                href: `/dashboard/${activeTenantId}/customers`,
              },
              {
                label: 'Sales Items',
                href: `/dashboard/${activeTenantId}/sales-items`,
              },
            ],
          },
          {
            label: 'Purchases',
            items: [
              {
                label: 'Purchase Invoices',
                href: `/dashboard/${activeTenantId}/purchase-invoices`,
              },
              {
                label: 'Purchase Payments',
                href: `/dashboard/${activeTenantId}/purchase-payments`,
              },
              {
                label: 'Suppliers',
                href: `/dashboard/${activeTenantId}/suppliers`,
              },
            ],
          },
          {
            label: 'Accounting',
            items: [
              {
                label: 'Chart of Accounts',
                href: `/dashboard/${activeTenantId}/accounts`,
              },
              {
                label: 'Journal',
                href: `/dashboard/${activeTenantId}/journal`,
              },
            ],
          },
          {
            label: 'Inventory',
            items: [
              {
                label: 'Stock Movements',
                href: `/dashboard/${activeTenantId}/inventory/stock-movements`,
              },
              {
                label: 'Items',
                href: `/dashboard/${activeTenantId}/inventory/items`,
              },
            ],
          },
          {
            label: 'Reports',
            items: [
              {
                label: 'General Ledger',
                href: `/dashboard/${activeTenantId}/reports/general-ledger`,
              },
              {
                label: 'Profit And Loss',
                href: `/dashboard/${activeTenantId}/reports/profit-loss`,
              },
              {
                label: 'Balance Sheet',
                href: `/dashboard/${activeTenantId}/reports/balance-sheet`,
              },
              {
                label: 'Trial Balance',
                href: `/dashboard/${activeTenantId}/reports/trial-balance`,
              },
            ],
          },
          {
            label: 'Documents',
            items: [
              {
                label: 'Documents',
                href: `/dashboard/${activeTenantId}/documents`,
              },
              {
                label: 'Print Templates',
                href: `/dashboard/${activeTenantId}/print-templates`,
              },
            ],
          },
          {
            label: 'Settings',
            items: [
              {
                label: 'Company Settings',
                href: `/dashboard/${activeTenantId}/settings`,
              },
            ],
          },
          ...(user?.role === 'BUSINESS' && user?.tenantId === activeTenantId
            ? [
                {
                  label: 'Setup',
                  items: [
                    {
                      label: 'Invite CA',
                      href: `/dashboard/${activeTenantId}/team`,
                    },
                  ],
                },
              ]
            : []),
        ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-lg font-bold text-[var(--primary)]">
            LedgerLite
          </Link>
          <div className="flex items-center gap-4">
            {user?.role === 'CA' && tenants.length > 1 && (
              <select
                value={activeTenantId ?? ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedTenantId(id);
                  router.push(`/dashboard/${id}`);
                }}
                className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <span className="text-sm text-[var(--muted-foreground)]">{user?.email}</span>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.replace('/login');
              }}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl">
        <nav className="hidden w-56 border-r border-[var(--border)] bg-[var(--card)] px-3 py-4 md:block">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {section.label}
              </p>
              <div className="mt-1 space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded px-2 py-1.5 text-sm ${
                        active
                          ? 'bg-[var(--muted)] text-[var(--foreground)]'
                          : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <main className="flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
