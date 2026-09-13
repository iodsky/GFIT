# AGENTS.md — GFIT

pnpm monorepo (coaching-session confirmation SaaS). Stack: `frontend/` = Vite React, `backend/` = Hono. Note: `docs/plans/2026-09-09-implementation-plan.md`, `docs/product/product.md`, and `README.md` still say Next.js/NestJS — stale on framework choice, follow this file instead. Those docs remain source of truth for domain, invariants, and build order only.

## Workspaces

- `frontend/` Vite React (Platform Admin, Coach consoles, public confirm page) → Cloudflare Pages, mobile/tablet-first.
- `backend/` Hono (REST + middleware authZ + entitlement checks).
- `packages/*` shared TS (domain models, DTOs, types/utils). Import via `@gfit/*` → `packages/*/src` (see `tsconfig.base.json` paths).
- `supabase/` migrations/RLS/seed/config — **not** a Node workspace (excluded from `pnpm-workspace.yaml`). Never add it there.
- `docker/`, `packages/`, `supabase/`, `.github/` are currently only `.gitkeep` placeholders.

## Commands (run from root)

- Requires Node `24.19.0` (`.nvmrc`) + pnpm `11.26.0` (`packageManager` + `devEngines`). Use `pnpm`, never npm/yarn.
- `pnpm install` — install all workspaces.
- `pnpm dev|build|lint|typecheck|test` — fan out via `pnpm -r --if-present` (`dev` adds `--parallel`). A missing script in a workspace is expected, not an error.
- Focused: `pnpm --filter <workspace> <script>` (e.g. `pnpm --filter backend typecheck`).
- `pnpm format` (prettier `--check .`) / `pnpm format:fix` (write). Style: singleQuote, trailingComma all, printWidth 100, semi; 2-space LF (`.editorconfig`).

## TS / lint baseline

- Workspaces extend `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables`, `moduleResolution Bundler`, `noEmit`. Keep these on.
- Root `eslint.config.js` is minimal (ignores `node_modules/dist/build/.next/out/coverage`); add `typescript-eslint` / vite / react configs per-workspace when scaffolding, don't weaken root ignores.

## Architecture invariants (do not violate)

- Tenant = gym. Every tenant-scoped row carries `tenant_id`; RLS on all tenant tables is the backstop.
- JWT carries `role` + `tenant_ids[]`. `platform_admin` is global; `coach` is per-tenant via `membership`. Coach requests must carry explicit active-tenant context — never infer globally.
- Never put Supabase service-role key in `frontend/`. Public confirm page: CSP, no third-party scripts, escape inputs.
- Session token: crypto-random ~256-bit opaque, 30-min TTL, single-use; regeneration invalidates prior; no enumerable IDs in public URLs.
- `confirmation` is write-once (one per session): typed_name + consent flag + timestamp + IP/UA + content hash. Fallback completion uses `completion_method=by_coach` (auditable, shown "without signature").
- Coach screen uses manual refresh — no realtime subscriptions in MVP. Soft-archive gyms (retain data). Coach invite = magic link.

## Commits

- Header: `<tag>: <short title>` with tag one of `feat|fix|refactor|chore|docs|tests`.
- Body: bullets, all lowercase, one change per bullet.

## Plans

- New plans go in `docs/plans/` (e.g. `docs/plans/2026-09-09-implementation-plan.md`).
- Filename must be `YYYY-MM-DD-<short-summary>.md` (date + summary required).

## Gotchas

- `frontend/` + `backend/` `package.json` are still `npm init` placeholders whose `test` script is `exit 1`. `pnpm test` fails until Phase 0 scaffolding lands — scaffold Vite React / Hono properly instead of working around it.
- No CI workflows yet (`docs/plans/2026-09-09-implementation-plan.md` Phase 0 calls for lint+typecheck+build+test). Verify with `pnpm lint && pnpm typecheck && pnpm build` before claiming done.
- Env: never commit `.env*` (only `.env.example`). Local Supabase/Cloudflare state (`supabase/.branches/.temp`, `.wrangler/`, `.dev.vars`) is gitignored.
