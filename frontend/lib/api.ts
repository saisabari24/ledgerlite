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
  const res = await fetch(`${API_BASE}/api${path}`, { ...init, headers });
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
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  tenantEmail?: string | null;
  termsAndConditions?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
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

export type Item = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  unit: string;
  rate: number;
  taxRate: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  tenantId: string;
  movementNo: string;
  status: string;
  date: string;
  movementType: string;
  description: string | null;
  journalEntryId: string | null;
  createdAt: string;
  updatedAt: string;
  lines: StockMovementLine[];
};

export type StockMovementLine = {
  id: string;
  stockMovementId: string;
  itemId: string;
  quantity: number;
  fromAccountId: string | null;
  toAccountId: string | null;
  createdAt: string;
  item: Item;
  fromAccount: Account | null;
  toAccount: Account | null;
};

export type Customer = {
  id: string;
  tenantId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  balance: number;
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  tenantId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  balance: number;
  createdAt: string;
  updatedAt: string;
};

export type SalesQuoteLine = {
  id: string;
  itemId: string;
  description: string | null;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
  item: Item;
};

export type SalesQuote = {
  id: string;
  tenantId: string;
  quoteNo: string;
  date: string;
  customerId: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  description: string | null;
  customer: Customer;
  lines: SalesQuoteLine[];
};

export type SalesInvoiceLine = {
  id: string;
  itemId: string;
  accountId: string | null;
  description: string | null;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
  item: Item;
  account: Account | null;
};

export type SalesInvoice = {
  id: string;
  tenantId: string;
  invoiceNo: string;
  date: string;
  dueDate?: string | null;
  customerId: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  description: string | null;
  terms: string | null;
  customer: Customer;
  lines: SalesInvoiceLine[];
  allocations?: SalesPaymentAllocation[];
};

export type SalesPaymentAllocation = {
  id: string;
  salesInvoiceId: string;
  amount: number;
  salesInvoice: SalesInvoice;
};

export type SalesPayment = {
  id: string;
  tenantId: string;
  paymentNo: string;
  date: string;
  customerId: string;
  mode: string;
  reference: string | null;
  amount: number;
  accountId: string | null;
  account: Account | null;
  customer: Customer;
  allocations: SalesPaymentAllocation[];
};

export type PurchaseInvoiceLine = {
  id: string;
  itemId: string;
  accountId: string | null;
  description: string | null;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
  item: Item;
  account: Account | null;
};

export type PurchaseInvoice = {
  id: string;
  tenantId: string;
  invoiceNo: string;
  date: string;
  dueDate?: string | null;
  supplierId: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  description: string | null;
  terms: string | null;
  supplier: Supplier;
  lines: PurchaseInvoiceLine[];
  allocations?: PurchasePaymentAllocation[];
};

export type PurchasePaymentAllocation = {
  id: string;
  purchaseInvoiceId: string;
  amount: number;
  purchaseInvoice: PurchaseInvoice;
};

export type PurchasePayment = {
  id: string;
  tenantId: string;
  paymentNo: string;
  date: string;
  supplierId: string;
  mode: string;
  reference: string | null;
  amount: number;
  accountId: string | null;
  account: Account | null;
  supplier: Supplier;
  allocations: PurchasePaymentAllocation[];
};
