# Database conventions

- Drizzle TypeScript schemas under `schema/` are the database source of truth. Generate migration files with `pnpm db:generate`; do not hand-write migration SQL.
- Every future tenant-scoped table must include a non-null `tenant_id`.
- Tenant-scoped tables must have row-level security enabled with explicit tenant authorization policies before application access is added.

These are conventions only. No domain tables or RLS policies are implemented here; enforcement is reserved for Phase 1.
