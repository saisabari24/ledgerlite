# LedgerLite — Work Breakdown & Man-Hours Estimate

> **Project**: Multi-tenant cloud bookkeeping SaaS (NestJS + Next.js + PostgreSQL)  
> **Scope**: 23 DB models | 7 enums | ~72 API endpoints | 31 frontend pages | ~13,500 LOC | 5 Docker services  
> **Date**: May 2026

---

## Traditional Development — Total: 1,260 Hours

### 1. UI/UX DESIGN — 120 Hours

| Task | Hours |
|------|-------|
| Design system (color palette, typography, spacing, dark/light theme, CSS variables) | 24 |
| Dashboard layout wireframes (sidebar, header, tenant switcher) | 16 |
| Auth pages (login, register) | 6 |
| Dashboard summary cards | 4 |
| Chart of Accounts (hierarchical tree design) | 8 |
| Journal entry (multi-line debit/credit form) | 6 |
| Sales flow (quotes → invoices → payments) | 10 |
| Purchase flow (invoices → payments) | 8 |
| Inventory (items + stock movements) | 6 |
| Reports (trial balance, P&L, balance sheet, ledger) | 6 |
| Documents & file management | 4 |
| Print template WYSIWYG editor | 6 |
| Settings (company profile, bank details, logo upload) | 4 |
| Team/CA management | 4 |
| Print template HTML designs (8 templates: Minimal + Professional × 4 document types) | 16 |

---

### 2. FRONTEND DEVELOPMENT — 440 Hours

| Task | Hours |
|------|-------|
| **Setup & Architecture** | **32** |
| Next.js + Tailwind project initialization | 4 |
| API client library (`lib/api.ts`, 292 lines, 15+ type definitions) | 8 |
| Auth flow (login, register, logout, token storage, protected routes) | 12 |
| Route structure and TypeScript config | 4 |
| CSS variables, globals, Tailwind theme config | 4 |
| **Dashboard Shell** (`layout.tsx`, 284 lines) | **24** |
| Layout with responsive sidebar + header | 12 |
| Tenant loading & role-based switching (BUSINESS/CA) | 8 |
| Nav active states, mobile considerations | 4 |
| **Core Accounting Pages** | **88** |
| Dashboard summary (balance cards) | 6 |
| Chart of Accounts — hierarchical tree table, expand/collapse, inline row CRUD, type filter | 24 |
| Journal — multi-line form, debit/credit auto-calc, post/cancel/delete modal, status badges, date/description | 28 |
| Ledger — account selector, date range filter, running balance computation, 2-column table | 12 |
| Reports — trial balance (debit/credit columns + totals), P&L (income vs expense), balance sheet (dual panel assets/liabilities), general ledger | 18 |
| **Sales Module** | **80** |
| Sales Quotes — multi-line items, auto-rate on item select, subtotal/tax/total computation, status badges | 18 |
| Sales Invoices — same multi-line + account selector, post action, invoice totals, customer select | 22 |
| Sales Payments — dynamic invoice allocation, multi-row allocation, auto-amount tracking, mode picker, post action | 20 |
| Customers — table with 8-field inline create + inline edit, address/pincode, delete modal | 12 |
| Sales Items — inline edit table | 8 |
| **Purchase Module** | **60** |
| Purchase Invoices — multi-line, account mapping, supplier select, post action, status | 20 |
| Purchase Payments — dynamic allocation, post, mode/reference | 18 |
| Suppliers — 8-field inline create + edit, address fields | 12 |
| Integration with items | 10 |
| **Inventory Module** | **36** |
| Items — table with inline create form (code, name, unit, rate, description) + inline edit + delete | 14 |
| Stock Movements — multi-line form, from/to account dropdowns per line, quantity × item rate, post with auto-journal, movement type selector | 22 |
| **Print Templates** | **48** |
| Template list — create, set-default, duplicate, delete actions | 8 |
| WYSIWYG editor — HTML textarea, live iframe preview (500ms debounce), placeholder insertion popover with categories, template metadata editor | 32 |
| Template rendering endpoint integration | 8 |
| **Documents** | **20** |
| File upload (FormData, multipart, 10MB, image preview) | 10 |
| Download (blob handling, object URL), delete with confirm | 8 |
| Link to journal entry | 2 |
| **Settings & Team** | **28** |
| Company settings — 16-field form (name, address, GSTIN, PAN, bank details, T&C), logo upload (2MB, PNG/JPEG/WebP), form sections | 16 |
| Team/CA management — invite-by-email form, permission display, revoke with confirm, role-gated visibility | 12 |
| **Polish & Edge Cases** | **24** |
| Loading states (spinners, skeletons) | 6 |
| Empty states for all 20+ list pages | 6 |
| Error handling across all forms | 4 |
| Responsive fixes | 8 |

---

### 3. BACKEND DEVELOPMENT — 480 Hours

| Task | Hours |
|------|-------|
| **Architecture & Setup** | **24** |
| NestJS scaffolding, module structure, dependency injection | 4 |
| Prisma schema design — 23 models, 7 enums, 80+ relations, composite unique constraints, Decimal types | 16 |
| Database migration strategy (7 migrations) | 4 |
| **Auth & Security** | **36** |
| JWT authentication (Passport strategy, 7-day token expiry) | 12 |
| Registration with auto-Tenant creation for BUSINESS users | 8 |
| Login with bcrypt (10-round salt), JWT signing | 4 |
| @CurrentUser param decorator | 2 |
| Rate limiting — global 100/min, login 5/min via @Throttle | 4 |
| Helmet + CORS + security headers | 4 |
| ValidationPipe — whitelist + forbidNonWhitelisted | 2 |
| **Multi-Tenancy** | **36** |
| Tenant CRUD + logo upload (multer, disk storage, mime validation) | 14 |
| CaAccess — invite-by-email, grant, revoke, list-for-tenant, list-for-CA | 10 |
| TenantGuard — role-based access check (BUSINESS owns; CA has CaAccess) | 8 |
| Tenant isolation enforced across every controller method | 4 |
| **Double-Entry Journal Engine** | **48** |
| 6 accounting rules validation (≥2 lines, debit OR credit, ≥0, ≠0, totals equal, no group accounts) | 8 |
| Create DRAFT entries with $transaction | 6 |
| Post DRAFT→POSTED: per-account balance update (debit - credit, type-aware) | 12 |
| Cancel POSTED→CANCELLED: balance reversal | 8 |
| Delete posted: reverse balances before hard delete | 8 |
| Atomic $transaction() for all financial mutations | 6 |
| **Chart of Accounts** | **32** |
| CRUD with hierarchical parent/child, isGroup constraints | 10 |
| Balance computation (debit increases assets/expenses, credit increases liabilities/equity/income) | 8 |
| Seed default COA (22 accounts: Cash, Bank, AR, AP, GST, Equity, Revenue, COGS, 6 expense leaves) | 8 |
| Delete protection (children or journal lines exist) | 6 |
| **Sales Module** | **60** |
| Quotes CRUD + auto-numbering Q-0001, status lifecycle DRAFT/SENT/ACCEPTED/EXPIRED | 14 |
| Invoice CRUD + auto-numbering INV-0001, auto-calc subtotal/tax/total | 8 |
| Invoice posting: auto-journal generation (debit AR, credit per-line income accounts), account balance update, customer balance update | 16 |
| Invoice deletion with journal reversal | 6 |
| Payment CRUD + auto-numbering PAY-0001, multi-allocation | 6 |
| Payment posting: auto-journal (debit cash/bank, credit AR), invoice allocation, status transitions UNPAID→PARTIALLY_PAID→PAID | 10 |
| **Purchase Module** | **48** |
| Invoice CRUD + auto-numbering PINV-0001, auto-calc | 8 |
| Invoice posting: auto-journal (debit per-line expense accounts, credit AP), supplier balance | 16 |
| Invoice deletion with reversal | 6 |
| Payment CRUD + auto-numbering PPAY-0001, multi-allocation | 6 |
| Payment posting: auto-journal (debit AP, credit cash/bank), invoice status updates | 12 |
| **Inventory Module** | **36** |
| Items CRUD with unique code per tenant, delete protection | 8 |
| Stock Movement CRUD + auto-number SM-0001, movement types | 10 |
| Movement posting: auto-journal generation (debit toAccount, credit fromAccount × rate × qty), balance update | 12 |
| Movement deletion with journal reversal | 6 |
| **Reports / Ledger** | **36** |
| Dashboard summary (aggregate balances by account type, compute profit) | 6 |
| Account ledger (posted lines, opening balance, running balance) | 8 |
| Trial balance (as-of date, per-account debit/credit columns) | 6 |
| Profit & Loss (period income vs expense allocation, net profit) | 8 |
| Balance sheet (assets vs liabilities+equity, as-of date) | 8 |
| **Print Templates** | **28** |
| Template CRUD with one-default-per-type enforcement | 6 |
| Custom template engine: {{settings.*}}, {{company.*}}, {{party.*}}, {{doc.*}}, {{totals.*}} placeholders | 12 |
| Loop support: {{#each lines}}...{{/each}} with {{line.*}} and {{index}} | 6 |
| Render endpoint with sample data + tenant settings merge | 4 |
| **Documents** | **12** |
| File upload (multer, disk storage, 10MB limit, mime whitelist) | 6 |
| Download (stream file), delete (remove file + DB), link-to-journal | 6 |
| **Customers & Suppliers** | **12** |
| Customers CRUD — 9 fields, delete protection if invoices exist | 6 |
| Suppliers CRUD — 9 fields, delete protection if invoices exist | 6 |
| **Seed Data & Migrations** | **20** |
| Seed script — 5 users, 3 tenants, 6 CaAccess records, chart of accounts, 5 items, 8 print templates, 2 customers, 2 suppliers, all secure passwords | 12 |
| 7 database migration files, schema evolution | 8 |
| **Validation & DTOs** | **16** |
| 20+ DTO classes with class-validator decorators (IsEmail, IsString, IsNumber, IsEnum, Min, IsOptional, ValidateNested) | 12 |
| Custom validation rules (account not group, unique code, parent must be group) | 4 |
| **Error Handling & Edge Cases** | **24** |
| Consistent error response formatting across all controllers | 6 |
| Transaction rollback handling | 6 |
| Unique constraint violations (duplicate email, code, GSTIN) | 4 |
| File system errors (disk full, permission denied) | 4 |
| End-to-end flow testing of all 72 endpoints | 4 |

---

### 4. DEVOPS / HOSTING — 100 Hours

| Task | Hours |
|------|-------|
| **Development Environment** | **16** |
| Docker Compose for dev (PostgreSQL 16, single-node, volume mount) | 6 |
| npm workspaces configuration (monorepo with backend + frontend) | 4 |
| Hot-reload setup (nest --watch, next dev, concurrently) | 4 |
| .env.example + .env management | 2 |
| **Dockerization** | **16** |
| Backend Dockerfile (node:20-alpine, multi-stage, npm ci, prisma generate, build) | 8 |
| Frontend Dockerfile (node:20-alpine, next build, standalone output) | 8 |
| **Production docker-compose.yml** | **16** |
| 5 services: postgres, backend, frontend, caddy, with health checks, depends_on, restart policies | 8 |
| Volume management (pg_data, uploads, caddy_data, caddy_config) | 4 |
| Internal network (database not exposed to internet) | 4 |
| **Caddy Reverse Proxy** | **16** |
| Caddyfile with auto-TLS (Let's Encrypt), gzip/zstd compression | 8 |
| Route handling (/api/* → backend, /tenants/* → backend, /* → frontend) | 4 |
| Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, XSS-Protection, Referrer-Policy) | 4 |
| **Automation Scripts** | **16** |
| setup.sh (148 lines) — Docker install, git clone, env config, UFW firewall, build, migrate, seed, cron | 10 |
| backup.sh (33 lines) — pg_dump + gzip, 7-day retention, monthly snapshots | 6 |
| **Security Hardening** | **12** |
| UFW firewall (ports 22, 80, 443 only) | 4 |
| 256-bit random DB_PASSWORD + JWT_SECRET generation | 2 |
| PostgreSQL health check (pg_isready) | 2 |
| DISABLE_REGISTRATION toggle for production | 2 |
| Container restart policies (unless-stopped) | 2 |
| **Deployment Documentation** | **8** |
| VPS-DEPLOY.md (307 lines) — architecture diagram, prerequisites, step-by-step, troubleshooting, quick reference | 8 |

---

### 5. TESTING / QA — 60 Hours

| Task | Hours |
|------|-------|
| API endpoint testing (all 72 endpoints — request/response, error cases) | 20 |
| Frontend page testing (all 31 pages — render, form submit, error states) | 18 |
| Multi-tenancy isolation testing (cross-tenant access rejection) | 6 |
| Journal engine — all 6 accounting rules, post/cancel/delete lifecycle | 6 |
| Auto-journal generation — sales invoices, purchase invoices, payments, stock movements | 4 |
| File upload/download (logo, documents) | 2 |
| Print template rendering with all placeholder types | 2 |
| Tenant role-based access (BUSINESS vs CA, permission levels) | 2 |

---

### 6. PROJECT MANAGEMENT / OTHER — 60 Hours

| Task | Hours |
|------|-------|
| Architecture planning & technical specification | 16 |
| Schema design review & iteration | 8 |
| Sprint planning & task breakdown | 8 |
| Code reviews | 12 |
| Client communication & demos | 8 |
| AGENTS.md + .cursor/ documentation (system_prompt, rules, architecture, database, product) | 8 |

---

## Traditional Summary

| Department | Hours | % |
|------------|------:|--:|
| UI/UX Design | 120 | 9.5% |
| Frontend Development | 440 | 34.9% |
| Backend Development | 480 | 38.1% |
| DevOps / Hosting | 100 | 7.9% |
| Testing / QA | 60 | 4.8% |
| Project Management | 60 | 4.8% |
| **Total (Traditional)** | **1,260** | **100%** |

---

## AI-Assisted Development — Total: 640 Hours

### Methodology

The following multipliers were applied to each task based on AI tool effectiveness (Cursor, Claude, Copilot, GPT-4):

| Task Category | AI Reduction | Rationale |
|---------------|-------------|-----------|
| Boilerplate CRUD (customers, suppliers, items) | 65–70% | AI generates entire models, controllers, services, forms in one shot |
| Scaffolding & wiring (modules, routes, DTOs) | 60% | AI autocompletes NestJS boilerplate, Prisma schema, validation decorators |
| Dynamic forms (journal, invoices, payments, stock) | 40–45% | AI handles state patterns, but domain logic needs human review |
| Complex business logic (journal engine, auto-posting, balance computation) | 30–35% | Heavily domain-specific; AI assists but human must verify accounting correctness |
| Reports & aggregation queries | 40% | AI writes Prisma aggregations but financial formulas need human validation |
| Print template engine (custom parser) | 35% | Regex + string replacement is AI-friendly, but WYSIWYG editor and edge cases need human tuning |
| DevOps configs (Dockerfiles, compose, Caddy, scripts) | 55% | AI generates entire configs from prompts; human reviews for security |
| Security (auth, guards, rate limiting, Helmet) | 45% | AI knows patterns but security review is manual |
| UI design / CSS | 50% | AI generates Tailwind layouts rapidly; design decisions remain human |
| Testing / QA | 50% | AI writes test cases but domain testing requires manual verification |
| Documentation | 60% | AI drafts documentation from code; human polishes |
| Project management & architecture | 25% | Minimal AI impact — architecture decisions are human-led |

---

### AI-Assisted Breakdown

#### 1. UI/UX DESIGN — 72 Hours

| Task | Trad. | AI Factor | AI-Assisted |
|------|------:|----------|------------:|
| Design system & theming | 24 | 0.55 | 13 |
| Dashboard layout wireframes | 16 | 0.50 | 8 |
| Auth pages | 6 | 0.50 | 3 |
| Dashboard summary cards | 4 | 0.55 | 2 |
| Chart of Accounts tree | 8 | 0.50 | 4 |
| Journal entry form | 6 | 0.55 | 3 |
| Sales flow | 10 | 0.55 | 6 |
| Purchase flow | 8 | 0.55 | 4 |
| Inventory | 6 | 0.55 | 3 |
| Reports | 6 | 0.55 | 3 |
| Documents | 4 | 0.55 | 2 |
| Print template editor | 6 | 0.60 | 4 |
| Settings | 4 | 0.55 | 2 |
| Team/CA management | 4 | 0.55 | 2 |
| 8 print template HTML designs | 16 | 0.35 | 5 |
| **Subtotal** | **120** | | **64** |

#### 2. FRONTEND DEVELOPMENT — 228 Hours

| Task | Trad. | AI Factor | AI-Assisted |
|------|------:|----------|------------:|
| **Setup & Architecture** | **32** | | **18** |
| Next.js + Tailwind init | 4 | 0.30 | 1 |
| API client library | 8 | 0.35 | 3 |
| Auth flow | 12 | 0.45 | 7 |
| Route structure, TS config | 4 | 0.35 | 1 |
| CSS vars, Tailwind config | 4 | 0.30 | 1 |
| **Dashboard Shell** | **24** | | **14** |
| Layout sidebar + header | 12 | 0.45 | 7 |
| Tenant switching | 8 | 0.45 | 4 |
| Nav active states | 4 | 0.40 | 2 |
| **Core Accounting** | **88** | | **52** |
| Dashboard summary | 6 | 0.40 | 4 |
| Chart of Accounts | 24 | 0.45 | 13 |
| Journal page | 28 | 0.45 | 15 |
| Ledger page | 12 | 0.40 | 7 |
| Reports pages | 18 | 0.40 | 11 |
| **Sales Module** | **80** | | **45** |
| Sales Quotes | 18 | 0.50 | 9 |
| Sales Invoices | 22 | 0.50 | 11 |
| Sales Payments | 20 | 0.50 | 10 |
| Customers | 12 | 0.35 | 4 |
| Sales Items | 8 | 0.35 | 3 |
| **Purchase Module** | **60** | | **33** |
| Purchase Invoices | 20 | 0.50 | 10 |
| Purchase Payments | 18 | 0.50 | 9 |
| Suppliers | 12 | 0.35 | 4 |
| Items integration | 10 | 0.40 | 6 |
| **Inventory** | **36** | | **19** |
| Items CRUD | 14 | 0.35 | 5 |
| Stock Movements | 22 | 0.50 | 11 |
| **Print Templates** | **48** | | **26** |
| Template list | 8 | 0.40 | 5 |
| WYSIWYG editor | 32 | 0.50 | 16 |
| Render integration | 8 | 0.40 | 5 |
| **Documents** | **20** | | **10** |
| File upload | 10 | 0.45 | 6 |
| Download, delete, link | 8 | 0.45 | 4 |
| **Settings & Team** | **28** | | **14** |
| Company settings | 16 | 0.35 | 6 |
| Team/CA management | 12 | 0.40 | 7 |
| **Polish** | **24** | | **15** |
| Loading/empty/error states | 16 | 0.40 | 10 |
| Responsive fixes | 8 | 0.45 | 4 |
| **Subtotal** | **440** | | **246** |

#### 3. BACKEND DEVELOPMENT — 246 Hours

| Task | Trad. | AI Factor | AI-Assisted |
|------|------:|----------|------------:|
| **Architecture & Setup** | **24** | | **14** |
| NestJS scaffolding | 4 | 0.30 | 1 |
| Prisma schema design | 16 | 0.35 | 6 |
| Migration strategy | 4 | 0.30 | 1 |
| **Auth & Security** | **36** | | **21** |
| JWT auth + Passport | 12 | 0.45 | 7 |
| Registration | 8 | 0.45 | 4 |
| Login + JWT signing | 4 | 0.45 | 2 |
| @CurrentUser decorator | 2 | 0.35 | 1 |
| Rate limiting | 4 | 0.35 | 1 |
| Helmet + CORS | 4 | 0.30 | 1 |
| ValidationPipe | 2 | 0.30 | 1 |
| **Multi-Tenancy** | **36** | | **20** |
| Tenant CRUD + logo | 14 | 0.40 | 6 |
| CaAccess service | 10 | 0.45 | 6 |
| TenantGuard | 8 | 0.40 | 5 |
| Tenant isolation | 4 | 0.40 | 2 |
| **Journal Engine** | **48** | | **33** |
| 6 rules validation | 8 | 0.65 | 5 |
| Create DRAFT + transaction | 6 | 0.55 | 3 |
| Post with balance update | 12 | 0.60 | 7 |
| Cancel with reversal | 8 | 0.60 | 5 |
| Delete reversal | 8 | 0.60 | 5 |
| Atomic transactions | 6 | 0.50 | 3 |
| **Chart of Accounts** | **32** | | **18** |
| Hierarchical CRUD | 10 | 0.40 | 4 |
| Balance computation | 8 | 0.60 | 5 |
| Seed default COA | 8 | 0.35 | 3 |
| Delete protection | 6 | 0.35 | 2 |
| **Sales Module** | **60** | | **34** |
| Quotes CRUD + numbering | 14 | 0.35 | 5 |
| Invoice CRUD | 8 | 0.35 | 3 |
| Invoice posting auto-journal | 16 | 0.60 | 10 |
| Invoice delete reversal | 6 | 0.60 | 4 |
| Payment CRUD | 6 | 0.35 | 2 |
| Payment posting + allocation | 10 | 0.55 | 6 |
| **Purchase Module** | **48** | | **28** |
| Invoice CRUD | 8 | 0.35 | 3 |
| Invoice posting auto-journal | 16 | 0.60 | 10 |
| Invoice delete reversal | 6 | 0.60 | 4 |
| Payment CRUD | 6 | 0.35 | 2 |
| Payment posting + allocation | 12 | 0.55 | 7 |
| **Inventory** | **36** | | **20** |
| Items CRUD | 8 | 0.35 | 3 |
| Stock Movement CRUD | 10 | 0.40 | 4 |
| Movement posting auto-journal | 12 | 0.60 | 7 |
| Movement delete reversal | 6 | 0.60 | 4 |
| **Reports** | **36** | | **20** |
| Dashboard summary | 6 | 0.45 | 3 |
| Account ledger | 8 | 0.50 | 4 |
| Trial balance | 6 | 0.45 | 3 |
| P&L | 8 | 0.50 | 4 |
| Balance sheet | 8 | 0.50 | 4 |
| **Print Templates** | **28** | | **17** |
| Template CRUD | 6 | 0.35 | 2 |
| Custom template engine | 12 | 0.55 | 7 |
| Loop support (#each) | 6 | 0.50 | 3 |
| Render endpoint | 4 | 0.40 | 2 |
| **Documents** | **12** | | **5** |
| File upload (multer) | 6 | 0.35 | 2 |
| Download, delete, link | 6 | 0.35 | 2 |
| **Customers & Suppliers** | **12** | | **4** |
| Customers CRUD | 6 | 0.30 | 2 |
| Suppliers CRUD | 6 | 0.30 | 2 |
| **Seed Data** | **20** | | **7** |
| Seed script | 12 | 0.30 | 4 |
| Migrations | 8 | 0.30 | 2 |
| **Validation/DTOs** | **16** | | **5** |
| 20+ DTO classes | 12 | 0.25 | 3 |
| Custom validation | 4 | 0.30 | 1 |
| **Error Handling** | **24** | | **12** |
| Error formatting | 6 | 0.35 | 2 |
| Transaction rollback | 6 | 0.45 | 3 |
| Constraint violations | 4 | 0.35 | 1 |
| File system errors | 4 | 0.35 | 1 |
| Flow testing | 4 | 0.35 | 1 |
| **Subtotal** | **480** | | **258** |

#### 4. DEVOPS / HOSTING — 52 Hours

| Task | Trad. | AI Factor | AI-Assisted |
|------|------:|----------|------------:|
| Dev Docker Compose | 6 | 0.30 | 2 |
| npm workspaces | 4 | 0.35 | 1 |
| Hot-reload setup | 4 | 0.35 | 1 |
| .env management | 2 | 0.30 | 1 |
| Backend Dockerfile | 8 | 0.30 | 2 |
| Frontend Dockerfile | 8 | 0.30 | 2 |
| Prod docker-compose (5 services) | 8 | 0.35 | 3 |
| Volume management | 4 | 0.30 | 1 |
| Internal network | 4 | 0.30 | 1 |
| Caddyfile + auto-TLS | 8 | 0.35 | 3 |
| Route handling | 4 | 0.30 | 1 |
| Security headers | 4 | 0.30 | 1 |
| setup.sh script | 10 | 0.35 | 4 |
| backup.sh script | 6 | 0.30 | 2 |
| UFW firewall | 4 | 0.30 | 1 |
| Secret generation | 2 | 0.30 | 1 |
| Health checks | 2 | 0.35 | 1 |
| Registration toggle | 2 | 0.30 | 1 |
| Restart policies | 2 | 0.30 | 1 |
| Deployment docs | 8 | 0.30 | 2 |
| **Subtotal** | **100** | | **32** |

#### 5. TESTING / QA — 32 Hours

| Task | Trad. | AI Factor | AI-Assisted |
|------|------:|----------|------------:|
| API endpoint testing (72 endpoints) | 20 | 0.45 | 11 |
| Frontend page testing (31 pages) | 18 | 0.45 | 10 |
| Multi-tenancy isolation | 6 | 0.55 | 3 |
| Journal engine rules | 6 | 0.60 | 4 |
| Auto-journal flows | 4 | 0.55 | 2 |
| File upload/download | 2 | 0.45 | 1 |
| Print template rendering | 2 | 0.50 | 1 |
| Role-based access | 2 | 0.50 | 1 |
| **Subtotal** | **60** | | **33** |

#### 6. PROJECT MANAGEMENT — 42 Hours

| Task | Trad. | AI Factor | AI-Assisted |
|------|------:|----------|------------:|
| Architecture planning | 16 | 0.80 | 13 |
| Schema design review | 8 | 0.80 | 6 |
| Sprint planning | 8 | 0.75 | 6 |
| Code reviews | 12 | 0.65 | 8 |
| Client demos | 8 | 0.90 | 7 |
| Documentation | 8 | 0.40 | 3 |
| **Subtotal** | **60** | | **43** |

---

## Comparison Summary

| Department | Traditional | AI-Assisted | Reduction |
|------------|------------:|------------:|----------:|
| UI/UX Design | 120 | 64 | 47% |
| Frontend Development | 440 | 246 | 44% |
| Backend Development | 480 | 258 | 46% |
| DevOps / Hosting | 100 | 32 | 68% |
| Testing / QA | 60 | 33 | 45% |
| Project Management | 60 | 43 | 28% |
| **Total** | **1,260** | **676** | **46%** |

---

## Effort by Feature Area (AI-Assisted)

| Feature | UI | FE | BE | DevOps | QA | PM | Total |
|---------|----|----|----|--------|-----|-----|-------|
| Auth & User Mgmt | 5 | 14 | 22 | — | 2 | 4 | 47 |
| Multi-Tenancy & Team | 4 | 16 | 20 | — | 2 | 3 | 45 |
| Double-Entry Journal | 3 | 15 | 33 | — | 4 | 4 | 59 |
| Chart of Accounts | 4 | 13 | 18 | — | 1 | 3 | 39 |
| Sales Module | 6 | 45 | 34 | — | 5 | 6 | 96 |
| Purchase Module | 4 | 33 | 28 | — | 4 | 5 | 74 |
| Inventory | 3 | 19 | 20 | — | 3 | 3 | 48 |
| Reports | 3 | 11 | 20 | — | 2 | 3 | 39 |
| Print Templates | 9 | 26 | 17 | — | 3 | 4 | 59 |
| Documents | 2 | 10 | 5 | — | 1 | 2 | 20 |
| Settings | 2 | 6 | — | — | — | 2 | 10 |
| Infrastructure | — | — | 6 | 32 | — | 4 | 42 |
| Cross-cutting | 15 | 15 | 12 | — | 6 | — | 48 |
| **Total** | **64** | **246** | **258** | **32** | **33** | **43** | **676** |

---

## Billing Rate Scenarios

### Traditional (1,260 hours)

| Rate/hour | Total |
|----------:|------:|
| $40 | $50,400 |
| $60 | $75,600 |
| $80 | $100,800 |
| $100 | $126,000 |
| $120 | $151,200 |

### AI-Assisted (676 hours)

| Rate/hour | Total |
|----------:|------:|
| $40 | $27,040 |
| $60 | $40,560 |
| $80 | $54,080 |
| $100 | $67,600 |
| $120 | $81,120 |

---

## Notes

1. **AI-assisted estimates** assume a developer proficient with tools like Cursor, Claude, Copilot, or GPT-4 for code generation, with effective prompt engineering. Actual savings depend on developer skill with these tools.

2. **Domain-specific accounting logic** (journal engine, balance computation, auto-journal posting, report formulas) has the lowest AI reduction (30–40%) because correctness must be manually verified — a single debit/credit error cascades across the entire ledger.

3. **Boilerplate tasks** (CRUD endpoints, DTOs, simple forms, Docker configs) see the highest AI reduction (60–70%).

4. **DevOps** shows the highest overall AI reduction (68%) because infrastructure-as-code is exceptionally well-suited to AI generation.

5. **Project management** shows the lowest AI reduction (28%) — architecture decisions, client communication, and strategic planning remain human-led activities.

6. **No test suite exists** in the current codebase. The QA hours above represent the effort that *should* be budgeted for a production-ready release.

7. The actual codebase was developed with AI assistance (evidenced by the `.cursor/` directory and `AGENTS.md`), so the AI-assisted column is the closer representation of actual effort expended.
