# GFIT

Coaching-session confirmation SaaS — pnpm monorepo.

Per `docs/plans/2026-09-09-implementation-plan.md`:

```
frontend/   Vite + React + TanStack Router + TanStack Query — Platform Admin, Coach consoles, Client confirmation page
backend/    Hono on AWS Lambda — REST API + authZ middleware + entitlement checks
packages/   shared TS packages (domain models, DTOs, zod schemas, shared types/utilities)
supabase/   Drizzle TS schema, generated migrations, RLS policies, seed data, config
docker/     local dev services (Supabase local stack via CLI)
```

Local-first: Phases 0–3 run fully on Docker with zero cloud accounts;
cloud provisioning (Supabase Cloud, Lambda + Function URL, Pages) lands in Phase 4.

## Prereqs

- Node `24.19.0` (see `.nvmrc`)
- pnpm `11.26.0` (enforced via `packageManager` + `devEngines`)
- Docker (local dev: Supabase stack via `supabase start`)

## Commands

```sh
pnpm install     # install all workspaces
pnpm dev         # run each workspace `dev` (if present)
pnpm build       # build each workspace (if present)
pnpm lint        # lint each workspace (if present)
pnpm typecheck   # typecheck each workspace (if present)
pnpm test        # test each workspace (if present)
pnpm format      # prettier check
pnpm format:fix  # prettier write
```

Workspace membership is defined in `pnpm-workspace.yaml`
(`frontend`, `backend`, `packages/*`). `supabase/` holds migrations/config,
not Node packages, so it is intentionally excluded.

## Local Development

Follow the [local development runbook](docs/runbooks/local-development.md) to run the backend with Docker Compose and the separate Supabase CLI stack.

## Status

- [x] Monorepo wiring (workspace globs, root `package.json`, base configs)
- [ ] `frontend/` Vite + React scaffold
- [ ] `backend/` Hono scaffold (+ Dockerfile)
- [ ] `packages/*` shared packages (incl. zod API contract)
- [ ] `supabase/` Drizzle schema + generated migrations + RLS + seed
- [ ] `docker/` local dev services
- [ ] Cloud provisioning (Supabase Cloud, Lambda + Function URL, Pages) — Phase 4
- [ ] CI — deferred until scaffolding lands
