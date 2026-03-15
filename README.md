# LedgerLite

Minimal cloud bookkeeping platform where Chartered Accountants manage multiple businesses.

## Tech Stack

- **Frontend**: Next.js, React, Tailwind, shadcn/ui
- **Backend**: NestJS, TypeScript, Prisma
- **Database**: PostgreSQL

## Quick Start

### 1. Environment

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
```

### 2. Database

```bash
# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Run migrations
npm run db:migrate --workspace=backend

# Seed demo data (optional)
npm run db:seed --workspace=backend
```

### 3. Install & generate Prisma client

From the project root:

```bash
# Install all workspace dependencies
npm install

# Generate Prisma client for the backend
npm run db:generate --workspace=backend
```

### 4. Run in development

In one terminal (from project root):

```bash
# Start backend and frontend together
npm run dev
```

Or separately:

```bash
# Backend only
cd backend
npm run dev

# Frontend only
cd ../frontend
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:3000

### Seed Users

**CAs** (password: `password123`):
- ca1@example.com
- ca2@example.com

**Businesses** (password: `password123`):
- business1@example.com → ABC Pvt Ltd
- business2@example.com → TechNova LLP
- business3@example.com → Zenith Industries

Both CAs have access to all 3 businesses.

## Architecture

- **Multi-tenant**: Each business is a tenant. All financial tables include `tenantId`.
- **CA access**: 1 CA → many businesses via explicit `ca_access` mapping.
- **Double-entry**: Every journal entry satisfies Total Debit = Total Credit.

## Development Priority

1. Authentication ✓
2. Tenant system ✓
3. CA access system ✓
4. Chart of accounts ✓
5. Journal entry engine ✓
6. Ledger ✓
7. Dashboard ✓
