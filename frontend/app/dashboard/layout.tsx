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
      <nav className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-6xl gap-6 px-4 py-2">
          <Link
            href={activeTenantId ? `/dashboard/${activeTenantId}` : '/dashboard'}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Dashboard
          </Link>
          {activeTenantId && (
            <>
              <Link
                href={`/dashboard/${activeTenantId}/accounts`}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Chart of Accounts
              </Link>
              <Link
                href={`/dashboard/${activeTenantId}/journal`}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Journal
              </Link>
              <Link
                href={`/dashboard/${activeTenantId}/ledger`}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Ledger
              </Link>
              <Link
                href={`/dashboard/${activeTenantId}/reports`}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Reports
              </Link>
              <Link
                href={`/dashboard/${activeTenantId}/documents`}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Documents
              </Link>
              {user?.role === 'BUSINESS' && user?.tenantId === activeTenantId && (
                <Link
                  href={`/dashboard/${activeTenantId}/team`}
                  className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  Invite CA
                </Link>
              )}
            </>
          )}
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
