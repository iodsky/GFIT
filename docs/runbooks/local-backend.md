# Local Backend Runbook

This runbook covers the Hono backend commands. For the containerized backend and separate Supabase local stack, see the [local development runbook](local-development.md).

## Requirements

- Node.js `24.19.0` (`.nvmrc`)
- pnpm `11.26.0` (`packageManager` in the root `package.json`)
- Run commands from the repository root and use pnpm, not npm or yarn.

Check the active versions:

```sh
node --version
pnpm --version
```

## Install Dependencies

From the repository root:

```sh
pnpm install
```

## Environment

The backend dev script reads `backend/.env` when that file exists. Use [backend/.env.example](../../backend/.env.example) as the only template for local backend variables. Do not commit `.env` files or put the Supabase service-role key in `frontend/`.

The example lists:

- `NODE_ENV` — `development` in the example; config defaults to `development`.
- `PORT` — `3000` in the example; config defaults to `3000`.
- `CORS_ALLOWED_ORIGIN` — `http://localhost:5173` in the example.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — blank in the example and optional for the current backend scaffold. If configured, provide both together.

The current backend has no application-specific database queries or domain tables. Supabase CLI and Drizzle wiring are available; the schema currently contains only a non-domain wiring probe.

## Run Locally

Start the backend in watch mode:

```sh
pnpm --filter backend dev
```

The server listens on `http://localhost:3000` by default. The available health endpoint is `GET /health`.

## Backend Checks

Run these commands from the repository root:

```sh
pnpm --filter backend lint
pnpm --filter backend typecheck
pnpm --filter backend test
pnpm --filter backend build
```

The build emits JavaScript under `backend/dist/`.

## Repository Conventions

- Use pnpm workspace commands; target backend tasks with `--filter backend`.
- Keep the shared strict TypeScript settings, including `strict`, `noUncheckedIndexedAccess`, and `useUnknownInCatchVariables`.
- Shared TypeScript imports use `@gfit/*` and resolve through `packages/*/src`.
- `supabase/` is not a Node workspace. Do not add it to `pnpm-workspace.yaml`.
- Keep secrets out of source control and frontend code; use `.env.example` as the tracked environment template.

## Docker

The backend Dockerfile is used by the Compose workflow documented in [Local Development](local-development.md). Supabase itself is started and stopped separately through its CLI.
