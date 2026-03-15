'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type CaAccess = {
  id: string;
  caUserId: string;
  permissionLevel: string;
  caUser: { id: string; email: string };
};

export default function TeamPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [accessList, setAccessList] = useState<CaAccess[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tenantId) return;
    loadAccess(token);
  }, [tenantId]);

  async function loadAccess(token: string) {
    setLoading(true);
    try {
      const list = await api<CaAccess[]>(`/ca-access/tenant/${tenantId}`, { token });
      setAccessList(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim()) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    setInviting(true);
    try {
      await api('/ca-access/invite-by-email', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          email: email.trim().toLowerCase(),
        }),
        token,
      });
      setSuccess(`Invited ${email} successfully.`);
      setEmail('');
      await loadAccess(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(caUserId: string) {
    if (!confirm('Revoke this CA\'s access?')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    setError('');
    try {
      await api(`/ca-access/${caUserId}/${tenantId}`, {
        method: 'DELETE',
        token,
      });
      await loadAccess(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed');
    }
  }

  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr ? JSON.parse(userStr) : null;
  const isOwner = user?.role === 'BUSINESS' && user?.tenantId === tenantId;

  if (!isOwner) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="text-[var(--muted-foreground)]">Only the business owner can manage CA access.</p>
      </div>
    );
  }

  if (loading && accessList.length === 0) {
    return <p className="text-[var(--muted-foreground)]">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Invite CA</h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        Invite Chartered Accountants to access your business. They must have an account with LedgerLite.
      </p>

      <form onSubmit={handleInvite} className="flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ca@example.com"
          required
          className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={inviting}
          className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
        >
          {inviting ? 'Inviting...' : 'Invite CA'}
        </button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-[var(--primary)]">{success}</p>}

      <div className="space-y-2">
        <h2 className="text-lg font-medium">CAs with access</h2>
        {accessList.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No CAs have been invited yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Permission</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {accessList.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)]">
                    <td className="px-4 py-2">{a.caUser.email}</td>
                    <td className="px-4 py-2">{a.permissionLevel}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleRevoke(a.caUserId)}
                        className="text-red-500 hover:underline"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
