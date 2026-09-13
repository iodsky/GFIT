# GFIT — Implementation Plan

## Overview

Build the GFIT MVP as a pnpm monorepo with four top-level areas: a Vite + React single-page frontend (deployed to Cloudflare Pages), a Hono API on AWS Lambda, shared TypeScript packages, and Supabase configuration (Postgres + Auth + RLS). Multi-tenancy and feature entitlement are designed in from day one.

## Architecture

```
frontend/   Vite + React + TanStack Router + TanStack Query — static SPA (Platform Admin, Coach consoles, Client confirmation page)
backend/    Hono on AWS Lambda + Function URL — REST API + authZ middleware + entitlement checks
packages/   shared TS packages (domain models, DTOs, zod schemas, shared types/utilities)
supabase/   Drizzle TS schema, generated migrations, RLS policies, seed data, config
```

- **Vite + React SPA** statically deployed to Cloudflare Pages (mobile/tablet-first web app). SPA fallback via `public/_redirects` (`/* /index.html 200`); route guards via TanStack Router `beforeLoad`; server state via TanStack Query.
- **Hono API** on AWS Lambda (Node 20+, `ap-southeast-1`, no VPC) behind a Lambda Function URL (auth `NONE`, CORS allowlisting the Pages domain). AuthZ middleware enforces JWT `role` + `tenant_ids[]` with explicit active-tenant context; request validation with zod; OpenAPI via `@hono/zod-openapi`.
- **Supabase** for Postgres (RLS), Auth (magic links), Storage (future needs). Schema is defined once in TypeScript via Drizzle; migrations are generated with `drizzle-kit generate` (no hand-written migration SQL). Runtime data access via `supabase-js`.
- Shared database + shared schema + `tenant_id` column + Postgres RLS.

## Multi-tenancy & Security

- JWT carries `role` + `tenant_ids[]`.
- Every coach-scoped request carries an explicit active-tenant context (never inferred globally).
- Authorization = "is this user an active member of the requested tenant?" or global `platform_admin`.
- RLS on all tenant tables as a final backstop.
- Confirmation token: crypto-random ~256-bit opaque, 30-min TTL, single-session, single-use; regeneration invalidates the prior token; no enumerable IDs in public URLs.
- Confirmation record: write-once, content hash, IP/UA/timestamp, typed name + consent flag.
- Name claiming requires phone-on-file verification; each slot accepts exactly one confirmation; 5 failed attempts lock the slot.
- Public page exposes only the session's masked client names — never the gym roster.
- Public page hardening: CSP, no third-party scripts, input escaping.
- Least-privilege Supabase keys (no service-role key in the frontend; service-role key lives in Lambda env only).
- CORS on the Function URL allowlists only the Cloudflare Pages domain.

## Non-functional Requirements

- Mobile/tablet-first; touch-friendly confirm page and coach session screen.
- QR → confirm load < ~2s on mid-tier mobile; coach screen uses manual refresh (no realtime).
- Lambda cold starts negligible for Hono's footprint at MVP scale.
- Supabase-managed availability/backups; idempotent confirm + retry (no lost signatures).
- Append-only audit trail; cheap audit fields stored now for future compliance.
- Extensible for future roles (gym_admin, client) and features.

## Build Order

- Local-first: Phases 0–3 run fully on Docker with zero cloud accounts; cloud provisioning (Supabase Cloud, Lambda, Pages) happens once, in Phase 4.
- Contract first: zod schemas in `packages/` (published as OpenAPI) are the shared source of truth for frontend and backend.
- Backend leads, frontend follows one slice behind — never build UI against imaginary endpoints.
- Spike one thin end-to-end slice early (start session → QR → scan → confirm across the local Docker stack) to validate the full loop before fleshing out admin screens and history.

## Phases

### Phase 0 — Scaffold & Local Dev (no cloud accounts needed)

- Initialize pnpm monorepo:
  - `frontend/` (Vite + React + TanStack Router + TanStack Query)
  - `backend/` (Hono, Lambda-ready + Dockerfile for local parity)
  - `packages/` (shared TS: domain models, DTOs, zod schemas, types/utilities)
  - `supabase/` (Drizzle TS schema, generated migrations, RLS policies, seed data, config)
  - `docker/` (local dev services)
- Local dev runs on Docker: Supabase local stack via CLI (`supabase start`) for Postgres + Auth + Studio; Drizzle migrations applied locally; frontend/backend run via `pnpm dev` against it.
- `public/_redirects` SPA fallback ships with the frontend from the start (needed for Pages later, harmless locally).
- CI deferred until scaffolding lands (no workflow file yet): placeholder `test: exit 1` scripts must be replaced or removed first so the first CI run is green. Until then, verify locally with `pnpm lint && pnpm typecheck && pnpm build`.
- Bootstrap Supabase Auth locally (magic-link invite flow via local Inbucket mail).

### Phase 1 — Tenancy + Platform Admin

- Domain tables + RLS via Drizzle schema → generated migrations:
  - `tenant`, `membership`, `tenant_feature`.
- JWT claims: `role` + `tenant_ids[]`; Hono authZ middleware (membership roles: `coach`, `gym_admin`).
- Publish the initial OpenAPI contract from zod schemas in `packages/`.
- Platform Admin console:
  - Gyms (add, edit, soft-archive) + designate gym admin.
  - Feature flags per gym.
- Gym Admin flow (scoped to their gym):
  - Coach signup invites via magic link; deactivate coaches.
  - Client roster CRUD (`client`: name, phone, email; shared roster, no coach assignment).
  - (Platform Admin retains fallback invite/deactivation.)

### Phase 2 — Coach Flows

- Gym switcher (active-tenant context).
- Coach multi-selects roster clients (solo = one client; no assignment).
- Session lifecycle:
  - Start session → creates `session_client` slots, binds coach + clients, `active` + single opaque token (30-min TTL).
  - One QR per session; mid-session regeneration (invalidate prior).
  - Coach ends session → outstanding slots become `unconfirmed`; cancel / abandon handling.
- Coach console UI (session screen with per-client status, client multi-picker).

### Phase 3 — Client Sign Flow

- Public confirmation page (mobile-first):
  - Session info display (gym, coach, date/time, type) + masked session name list.
  - Pick-your-name → phone-on-file verification → typed-name + consent + tap-to-confirm.
  - Duplicate-pick rejection; 5-attempt slot lockout (coach can reopen).
- On confirm: write `confirmation` record; set slot → `confirmed`.
- Idempotent confirm + retry on failure.

### Phase 4 — History, Cloud Provisioning & Hardening

- Coach session history (multi-gym, filterable by gym/client/date) with per-client `confirmed` / `unconfirmed` display.
- Coach-close completion (outstanding slots → `unconfirmed`); expiry / abandoned / cancelled edge cases.
- Audit logging.
- First cloud touch, in order: create Supabase Cloud project → apply migrations → provision AWS Lambda + Function URL (`ap-southeast-1`, no VPC, CORS for the Pages domain) → deploy frontend to Cloudflare Pages → end-to-end smoke test against cloud.

## Open Risks / Notes

- Compliance/legal (incl. retention, PH Data Privacy Act) intentionally deferred; audit fields retained to enable it later.
- Drawn-signature and other future features will be introduced behind feature flags rather than reworked.
- Coach push-notification on expired QR scans is deferred; expired scans surface via the friendly in-page message and regenerated QR.
- Function URL is one endpoint per function; a custom API domain (e.g. via CloudFront) is deferred until needed; API Gateway deliberately skipped for cost/simplicity.
- MongoDB Atlas evaluated and rejected: no RLS equivalent, wire-protocol driver incompatible with serverless edge runtimes, and schemaless does not remove data-modeling work.
- Migration SQL is never hand-written: the Drizzle schema in TS is the source of truth and `drizzle-kit generate` produces `supabase/migrations/`.
- Group confirm assumes co-located clients at scan time; remote QR-photo abuse is bounded by phone verification + 30-min TTL + coach-closed sessions.
