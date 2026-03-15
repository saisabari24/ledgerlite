'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, Tenant } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return;
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'BUSINESS' && user.tenantId) {
        router.replace(`/dashboard/${user.tenantId}`);
        return;
      }
      api<Tenant[]>('/tenants', { token }).then((tenants) => {
        if (tenants.length > 0) {
          router.replace(`/dashboard/${tenants[0].id}`);
        }
      });
    } catch {
      // ignore
    }
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-[var(--muted-foreground)]">Redirecting...</p>
    </div>
  );
}
