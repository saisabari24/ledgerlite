# AGENTS.md — LedgerLite

## Project Identity

- **LedgerLite**: minimal cloud bookkeeping SaaS. CAs manage multiple businesses from one dashboard.
- **Monorepo** (npm workspaces): `backend/` (NestJS + Prisma) and `frontend/` (Next.js + shadcn/ui + Tailwind).
- **Database**: PostgreSQL 16. Access via Docker (`docker-compose.yml`) in dev. Prisma ORM.
- **License constraint**: strictly prohibit copying code from Frappe Books or any AGPL project.

## Commands (run from repo root)

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Install deps + generate Prisma client
npm install
npm run db:generate             # runs prisma generate in backend

# Migrate (creates/updates DB schema)
npm run db:migrate               # = npm run db:migrate --workspace=backend

# Seed demo data (3 businesses, 2 CAs, chart of accounts, print templates)
npm run db:seed                  # = npm run db:seed --workspace=backend

# Start both services (backend :3001, frontend :3000)
npm run dev
# Or separately:
npm run dev:backend              # nest start --watch
npm run dev:frontend             # next dev
```

**Important**: after any schema change, must run `npm run db:generate` to regenerate the Prisma client. Running `npm run db:migrate` also triggers `generate` automatically.

## Environment

Copy `.env.example` → `.env` and fill `DATABASE_URL` and `JWT_SECRET`.  
Backend reads `.env` from the `backend/` directory, not the repo root.

Docker PostgreSQL defaults: user `ledgerlite`, password `ledgerlite`, db `ledgerlite`.

## Architecture & Conventions

### Multi-Tenancy

- Every financial table (`Account`, `JournalEntry`, `JournalLine`, `Document`, `PrintTemplate`) includes `tenantId`.
- **All queries must filter by `tenantId`**. No cross-tenant access permitted.
- Tenant isolation is enforced via `TenantService.assertAccess(user, tenantId)` called in every controller method.
- Two roles: `BUSINESS` (owns one tenant via `User.tenantId`) and `CA` (accesses multiple tenants via `CaAccess` mapping).

### Auth

- JWT-based. Token stored in `localStorage` on frontend, sent as `Bearer` header.
- `AuthGuard('jwt')` on every controller. User extracted via `@CurrentUser()` decorator.
- Frontend: `lib/api.ts` wraps fetch, injects the token from localStorage.

### Accounting Rules (non-negotiable)

The journal engine (`backend/src/journal/journal.service.ts:22-51`) enforces:
1. At least 2 lines per journal entry
2. Each line has debit **or** credit, never both
3. Both values must be non-negative (≥ 0)
4. At least one non-zero amount per line
5. Total debit **must** equal total credit
6. Journal lines cannot target group accounts (`isGroup: true`)
7. Account balances change **only** via journal posting — never directly

**All financial operations use `this.prisma.$transaction()`** for atomicity.

### Journal Lifecycle

`DRAFT` → `POSTED` → `CANCELLED`. Only `DRAFT` can be posted; only `POSTED` can be cancelled. Cancelling reverses the balance impact.

### Print Templates

- Per-tenant HTML templates with a custom `{{placeholder}}` syntax.
- Four types: `SALES_INVOICE`, `PURCHASE_INVOICE`, `QUOTE`, `PAYMENT`.
- Each `(tenantId, type)` has exactly one default. Seeded builtins have `isCustom: false`.
- **Never copy HTML/template code from Frappe.**

### Backend Module Structure

Each feature follows the NestJS convention: `src/<feature>/` → `controller`, `service`, `module`.  
Shared `PrismaService` is globally injectable via `PrismaModule`.

### Frontend Routing

- `app/dashboard/` — auth-protected via token check in `layout.tsx`.
- `app/dashboard/[tenantId]/` — tenant-scoped pages (journal, accounts, reports, etc.).
- `app/login/` and `app/register/` — public.

### Seeded Test Users

All passwords: `password123`  
CAs: `ca1@example.com`, `ca2@example.com` (access to all 3 businesses)  
Businesses: `business1@example.com` (ABC Pvt Ltd), `business2@example.com` (TechNova LLP), `business3@example.com` (Zenith Industries)

## Existing Instruction Files

The `.cursor/` directory contains detailed rules, architecture, and product docs used by Cursor IDE (see `cursor.config.json` for the file list). These are the source of truth for:
- `.cursor/rules.md` — 20 hard rules (no AGPL, tenant isolation, double-entry, etc.)
- `.cursor/system_prompt.md` — full system design and architecture principles
- `.cursor/architecture.md` — layered architecture and multi-tenant model
- `.cursor/database.md` — schema tables and constraints
- `.cursor/product.md` — PRD including print templates feature spec

## Notes

- No test suite exists yet (`*.spec.ts` / `*.test.ts` files are absent).
- No lint or typecheck commands configured. Run `npx tsc --noEmit` in each workspace for typechecking.
- NestJS uses `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` — unexpected fields in request bodies will be rejected.
- Frontend uses `localStorage` for auth state (not httpOnly cookies). The `api()` helper checks for 401/403 and throws.
