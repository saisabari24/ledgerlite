# Database Design

Database engine

PostgreSQL

ORM

Prisma


Tables

users

id
email
passwordHash
role


tenants

id
name
gstin
pan
currency


ca_access

id
caUserId
tenantId
permissionLevel


accounts

id
tenantId
code
name
type
balance


Account types

ASSET
LIABILITY
EQUITY
INCOME
EXPENSE


journal_entries

id
tenantId
date
description
status


journal_lines

id
journalEntryId
accountId
debit
credit


Key constraints

Total debit must equal total credit.

Each journal entry must contain at least two lines.

Debit or credit must be positive.

Never both.