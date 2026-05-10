# Cursor Rules

This repository builds a minimal cloud bookkeeping system.

CRITICAL RULES:

1. Never copy code from Frappe Books or any AGPL licensed project.

2. All accounting logic must be implemented from accounting principles
   (double entry bookkeeping).

3. Every transaction must satisfy:
   Total Debit = Total Credit

4. The system must be multi-tenant.

5. Data isolation is mandatory.

Every query must filter by tenantId.

6. A Chartered Accountant (CA) can access multiple tenants.

7. Businesses grant access to CAs explicitly.

8. Always prefer clarity over complexity.

9. UI must be minimal and lightweight.

10. Backend must validate accounting rules before writing to database.

11. Use database transactions for financial operations.

12. Never update account balances outside journal posting.

13. Journal entries must have at least 2 lines.

14. Each journal line must contain either debit or credit.

15. No negative values allowed in debit or credit fields.

16. System must maintain audit logs for important actions.

17. Follow TypeScript strict mode.

18. Avoid heavy frameworks or enterprise ERP complexity.

19. Design for scalability but keep MVP minimal.

20. If unsure, prefer simple implementations.