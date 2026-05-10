const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = err.message ?? res.statusText;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return res.json();
}

export type User = {
  id: string;
  email: string;
  role: 'BUSINESS' | 'CA';
  tenantId: string | null;
};

export type Tenant = {
  id: string;
  name: string;
  gstin?: string;
  pan?: string;
  currency: string;
};

export type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  isGroup?: boolean;
  parentId?: string | null;
};

export type JournalEntry = {
  id: string;
  date: string;
  description: string | null;
  status: string;
  lines: Array<{
    id: string;
    accountId: string;
    debit: number;
    credit: number;
    account: Account;
  }>;
};

export type PrintTemplate = {
  id: string;
  tenantId: string;
  name: string;
  type: 'SALES_INVOICE' | 'PURCHASE_INVOICE' | 'QUOTE' | 'PAYMENT';
  isDefault: boolean;
  isCustom: boolean;
  engine: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};
