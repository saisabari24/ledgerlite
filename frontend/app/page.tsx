'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--primary)]">LedgerLite</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">Loading...</p>
        <Link href="/login" className="mt-4 inline-block text-[var(--primary)] hover:underline">
          Go to Login
        </Link>
      </div>
    </div>
  );
}
