# System Architecture

High level architecture

Frontend
↓
API
↓
Accounting Engine
↓
Database


System layers

1 Presentation Layer
Next.js UI

2 API Layer
NestJS controllers

3 Domain Layer
Accounting engine services

4 Persistence Layer
Prisma + PostgreSQL


Multi Tenant Model

Tenant represents a business.

Users belong to tenants.

CA users can access multiple tenants through
explicit permission mapping.

Tables involved:

users
tenants
ca_access
accounts
journal_entries
journal_lines


Tenant isolation

Every table containing financial data must contain:

tenantId


Example query

SELECT * FROM journal_entries
WHERE tenant_id = :tenantId


CA access architecture

CA dashboard shows multiple tenants.

Switching tenant changes context.

CA cannot see tenant unless permission exists.


Accounting engine flow

User creates transaction
↓
Validation
↓
Journal entry created
↓
Entry posted
↓
Account balances updated