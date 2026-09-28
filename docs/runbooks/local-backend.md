# Local Backend Runbook

This runbook covers the currently available Hono backend workflow. Database setup and Docker image execution are not verified and are intentionally out of scope here.

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

The current backend does not connect to a database. Supabase/Drizzle setup, migrations, and seed data are pending; do not run database setup commands from this runbook.

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

## Docker Status

`backend/Dockerfile` has not been verified by an image build because the Docker engine was unavailable. Image build/run commands are omitted until Docker verification succeeds.