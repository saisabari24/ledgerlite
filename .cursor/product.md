# Product Context

Product Name

LedgerLite

Goal

A minimal cloud bookkeeping platform where Chartered
Accountants manage multiple businesses.

Primary actors

Business Owner
Chartered Accountant


Core Feature 1

Business account creation


Core Feature 2

Invite CA


Core Feature 3

CA multi client dashboard


Core Feature 4

Double entry accounting


Core Feature 5

Ledger view


Core Feature 6

Financial dashboard


Business to CA relationship

1 CA → many businesses

Businesses explicitly grant access.


CA dashboard example

Clients

ABC Pvt Ltd
TechNova LLP
Zenith Industries


Business dashboard example

Revenue
Expenses
Profit
Cash balance


MVP scope

Journal entries
Chart of accounts
Ledger
Basic reports


Out of scope

Inventory
Payroll
Manufacturing
CRM


Print Templates (Planned Feature)

Goal

Allow each tenant to define HTML-based print templates for financial documents
(e.g. sales invoices, purchase invoices, quotes, payments), with a library
view and an editor/preview screen similar in spirit to Frappe, implemented
from first principles and without copying any Frappe code.

Data model (Prisma / PostgreSQL)

- PrintTemplateType enum:
  - SALES_INVOICE
  - PURCHASE_INVOICE
  - QUOTE
  - PAYMENT

- PrintTemplate model:
  - id (string, cuid)
  - tenantId (string, required) – must always be present for multi-tenant
  - name (string) – template name, e.g. "Minimal – Sales Invoice"
  - type (PrintTemplateType) – document type
  - isDefault (boolean, default false) – at most one default per (tenantId, type)
  - isCustom (boolean, default true) – false for seeded/builtin templates
  - engine (string, default "HTML") – keep simple for MVP
  - body (string) – HTML template with placeholders (our own syntax)
  - createdAt, updatedAt timestamps

Backend API (NestJS)

- Routes are always tenant-scoped and must enforce tenant access:
  - GET   /tenants/:tenantId/print-templates
    - List all templates for that tenant.
  - POST  /tenants/:tenantId/print-templates
    - Create a new template (name, type, body, optional isDefault).
    - If isDefault is true, clear previous default for that (tenantId, type).
  - PATCH /tenants/:tenantId/print-templates/:id
    - Update name, type, body, isDefault.
    - Must preserve the "one default per type" rule.
  - DELETE /tenants/:tenantId/print-templates/:id
    - Delete a template if allowed (do not allow deleting the last default
      template for a given (tenantId, type)).

- Optional future route:
  - GET /tenants/:tenantId/print-templates/:id/render?sample=true
    - Returns rendered HTML for a sample document to power the preview.

Seeding behavior

- When a new tenant is created, seed a small set of builtin templates:
  - "Minimal – Sales Invoice"      (type: SALES_INVOICE, isDefault=true)
  - "Minimal – Purchase Invoice"   (type: PURCHASE_INVOICE, isDefault=true)
  - "Minimal – Quote"              (type: QUOTE, isDefault=true)
  - "Minimal – Payment"            (type: PAYMENT, isDefault=true)
- Seeded templates:
  - isCustom = false
  - body = simple, clean HTML layout with:
    - company header
    - party details
    - item table
    - tax/total section
    - terms block
  - Placeholders use our own syntax (e.g. {{company.name}}, {{doc.number}},
    {{line.description}}, {{totals.tax}}).

Frontend behavior (Next.js)

- Sidebar entry under a tenant scope: "Print Templates".

- List page: /dashboard/[tenantId]/print-templates
  - Table columns:
    - Template Name
    - Type
    - Is Default
    - Is Custom
  - Actions:
    - New Template (opens editor)
    - Row actions:
      - Edit
      - Set Default
      - Duplicate
      - Delete (disabled or warned for non-removable builtin templates).

- Editor/Preview page: /dashboard/[tenantId]/print-templates/[templateId]
  - Left side: live HTML preview using sample data.
  - Right side: editable HTML source (textarea or code editor).
  - Actions:
    - Save
    - Save As New (clone into a custom template)
    - Set as Default
  - This screen is purely presentational; actual document printing can be wired
    later when sales/purchase modules exist.

Constraints

- Never copy or paste code from Frappe or any AGPL project.
- Always include tenantId in PrintTemplate and enforce tenant isolation in
  all queries.
- Focus on clean, minimal HTML + Tailwind-friendly classes for templates.