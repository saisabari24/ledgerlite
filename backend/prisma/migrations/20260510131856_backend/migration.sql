-- CreateEnum
CREATE TYPE "SalesQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "PurchaseInvoiceStatus" AS ENUM ('DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesQuote" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "quote_no" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "SalesQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesQuoteLine" (
    "id" TEXT NOT NULL,
    "sales_quote_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 1,
    "rate" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesQuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoice" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "due_date" DATE,
    "customer_id" TEXT NOT NULL,
    "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "terms" TEXT,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoiceLine" (
    "id" TEXT NOT NULL,
    "sales_invoice_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "account_id" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 1,
    "rate" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPayment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_no" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customer_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "account_id" TEXT,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPaymentAllocation" (
    "id" TEXT NOT NULL,
    "sales_payment_id" TEXT NOT NULL,
    "sales_invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "due_date" DATE,
    "supplier_id" TEXT NOT NULL,
    "status" "PurchaseInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "terms" TEXT,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoiceLine" (
    "id" TEXT NOT NULL,
    "purchase_invoice_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "account_id" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 1,
    "rate" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePayment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_no" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "account_id" TEXT,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchasePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePaymentAllocation" (
    "id" TEXT NOT NULL,
    "purchase_payment_id" TEXT NOT NULL,
    "purchase_invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchasePaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_tenant_id_idx" ON "Customer"("tenant_id");

-- CreateIndex
CREATE INDEX "Supplier_tenant_id_idx" ON "Supplier"("tenant_id");

-- CreateIndex
CREATE INDEX "SalesQuote_tenant_id_idx" ON "SalesQuote"("tenant_id");

-- CreateIndex
CREATE INDEX "SalesQuote_tenant_id_quote_no_idx" ON "SalesQuote"("tenant_id", "quote_no");

-- CreateIndex
CREATE INDEX "SalesQuoteLine_sales_quote_id_idx" ON "SalesQuoteLine"("sales_quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_journal_entry_id_key" ON "SalesInvoice"("journal_entry_id");

-- CreateIndex
CREATE INDEX "SalesInvoice_tenant_id_idx" ON "SalesInvoice"("tenant_id");

-- CreateIndex
CREATE INDEX "SalesInvoice_tenant_id_invoice_no_idx" ON "SalesInvoice"("tenant_id", "invoice_no");

-- CreateIndex
CREATE INDEX "SalesInvoiceLine_sales_invoice_id_idx" ON "SalesInvoiceLine"("sales_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "SalesPayment_journal_entry_id_key" ON "SalesPayment"("journal_entry_id");

-- CreateIndex
CREATE INDEX "SalesPayment_tenant_id_idx" ON "SalesPayment"("tenant_id");

-- CreateIndex
CREATE INDEX "SalesPaymentAllocation_sales_payment_id_idx" ON "SalesPaymentAllocation"("sales_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "SalesPaymentAllocation_sales_payment_id_sales_invoice_id_key" ON "SalesPaymentAllocation"("sales_payment_id", "sales_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_journal_entry_id_key" ON "PurchaseInvoice"("journal_entry_id");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_tenant_id_idx" ON "PurchaseInvoice"("tenant_id");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_tenant_id_invoice_no_idx" ON "PurchaseInvoice"("tenant_id", "invoice_no");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceLine_purchase_invoice_id_idx" ON "PurchaseInvoiceLine"("purchase_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePayment_journal_entry_id_key" ON "PurchasePayment"("journal_entry_id");

-- CreateIndex
CREATE INDEX "PurchasePayment_tenant_id_idx" ON "PurchasePayment"("tenant_id");

-- CreateIndex
CREATE INDEX "PurchasePaymentAllocation_purchase_payment_id_idx" ON "PurchasePaymentAllocation"("purchase_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePaymentAllocation_purchase_payment_id_purchase_invo_key" ON "PurchasePaymentAllocation"("purchase_payment_id", "purchase_invoice_id");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuote" ADD CONSTRAINT "SalesQuote_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuote" ADD CONSTRAINT "SalesQuote_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuoteLine" ADD CONSTRAINT "SalesQuoteLine_sales_quote_id_fkey" FOREIGN KEY ("sales_quote_id") REFERENCES "SalesQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuoteLine" ADD CONSTRAINT "SalesQuoteLine_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPayment" ADD CONSTRAINT "SalesPayment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPayment" ADD CONSTRAINT "SalesPayment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPayment" ADD CONSTRAINT "SalesPayment_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPayment" ADD CONSTRAINT "SalesPayment_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPaymentAllocation" ADD CONSTRAINT "SalesPaymentAllocation_sales_payment_id_fkey" FOREIGN KEY ("sales_payment_id") REFERENCES "SalesPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPaymentAllocation" ADD CONSTRAINT "SalesPaymentAllocation_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "SalesInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePaymentAllocation" ADD CONSTRAINT "PurchasePaymentAllocation_purchase_payment_id_fkey" FOREIGN KEY ("purchase_payment_id") REFERENCES "PurchasePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePaymentAllocation" ADD CONSTRAINT "PurchasePaymentAllocation_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "PurchaseInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
