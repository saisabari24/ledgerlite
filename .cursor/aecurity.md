# Security Rules

Financial systems require strict security.

Tenant isolation

Every query must include tenantId.

Example

journal_entries.tenant_id = currentTenant


Authentication

JWT tokens


Authorization

RBAC roles

Roles

BUSINESS
CA


Permission checks

Business users can only access their own tenant.

CA users can access multiple tenants but only if
mapping exists in ca_access table.


Sensitive operations

Journal posting
Tenant deletion
User permissions


Audit logs must record

userId
action
entity
timestamp


Examples

CREATE_JOURNAL_ENTRY
POST_JOURNAL_ENTRY
DELETE_ACCOUNT


Never allow

Unbalanced journal entries
Direct balance manipulation
Cross tenant data access