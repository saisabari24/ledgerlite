# LedgerLite — Rough Billing (30–40 Hours Total)

> AI-assisted rapid build. All features delivered as one package in ~36 hours.

---

## Scope: What's Included

| Feature | What's Built | Hrs |
|---------|-------------|----:|
| Auth & User Management | JWT login/register, role system (BUSINESS/CA), protected routes, rate limiting, Helmet security | 3.5 |
| Multi-Tenancy & Team | Tenant CRUD (16 fields), CA invite/revoke, tenant isolation on all queries, tenant switcher UI, settings page | 3.0 |
| Chart of Accounts | Hierarchical tree (parent/child, isGroup), CRUD with validation, balance computation, seed 22 default accounts | 2.5 |
| Double-Entry Journal | 6 accounting rules validation, DRAFT→POSTED→CANCELLED lifecycle, balance updates with $transaction, multi-line form UI | 4.0 |
| Sales Quotes | CRUD, auto-number Q-0001, status lifecycle (4 states), multi-line items with tax/rate auto-calc, customer select | 2.5 |
| Sales Invoices | CRUD, auto-number INV-0001, multi-line with account mapping, posting with auto-journal (debit AR, credit income), customer balance | 3.0 |
| Sales Payments | CRUD, auto-number PAY-0001, multi-invoice allocation, posting auto-journal (debit cash, credit AR), invoice status transitions | 2.5 |
| Purchase Invoices | CRUD, auto-number PINV-0001, multi-line, posting auto-journal (debit expense, credit AP), supplier balance | 2.5 |
| Purchase Payments | CRUD, auto-number PPAY-0001, multi-allocation, posting auto-journal, invoice status updates | 2.0 |
| Customers & Suppliers | CRUD for both (9 fields each), address/contact details, delete protection | 1.0 |
| Inventory Items | CRUD with unique code, rate/tax, inline table management | 1.0 |
| Stock Movements | CRUD with dynamic lines, from/to account selectors, auto-journal on post (qty × rate), movement types | 2.0 |
| Reports | Dashboard summary, Account Ledger, Trial Balance, Profit & Loss, Balance Sheet — all with date filters | 2.5 |
| Print Templates | Custom {{placeholder}} engine with loop support, WYSIWYG editor with live iframe preview, 8 seed templates, set-default logic | 3.0 |
| Documents | File upload (10MB, mime filter), download as blob, link to journal | 1.5 |
| DevOps & Hosting | 2 Dockerfiles, production docker-compose (5 services), Caddy reverse proxy with auto-SSL, setup.sh + backup.sh scripts, UFW firewall, health checks | 2.5 |
| Seed Data | 5 users, 3 businesses, chart of accounts, items, customers, suppliers, print templates | 1.0 |
| Testing & QA | API smoke testing, tenant isolation verification, journal rule checks, UI render checks | 2.0 |
| Project Management | Architecture planning, schema design, code review, client demos | 1.5 |

---

## Summary

| | Hours |
|---|---|
| Backend (14 modules, 72 endpoints, 23 models) | ~18 |
| Frontend (31 pages, 7,978 LOC) | ~14 |
| DevOps (5 Docker services, auto-deploy) | ~2.5 |
| Other (seed, test, docs) | ~3.5 |
| **Total** | **38** |

---

## Billing

| Rate/hour | Total |
|----------:|------:|
| $60 | $2,280 |
| $80 | $3,040 |
| $100 | $3,800 |
| $120 | $4,560 |

---

## Assumptions

- AI-assisted development (Cursor/GPT-4/Claude) throughout
- Developer is proficient with NestJS, Prisma, Next.js, Tailwind, Docker
- No custom design system — uses Tailwind + CSS variables directly
- No test suite — smoke testing only
- Single developer, rapid iteration
- Production-ready deployment on a single VPS

---

## What's NOT Included

- Automated test suite (unit/integration/e2e)
- CI/CD pipeline
- Monitoring/alerting (Grafana, Sentry, etc.)
- Email notifications
- Multi-region / high-availability
- Formal pentesting or security audit
- Ongoing maintenance & support
