# Local Development

This setup runs the Hono backend in Docker Compose and runs the Supabase local stack through the Supabase CLI. Compose does not define Postgres or any Supabase services.

## Prerequisites

- Node.js `24.19.0` and pnpm `11.26.0` from the repository pins.
- Docker Desktop with Linux containers and the Docker Compose plugin.

From the repository root, install workspace dependencies and create the ignored backend environment file:

```powershell
pnpm install
Copy-Item backend/.env.example backend/.env
```

The example leaves Supabase credentials blank, which is valid for the current backend health endpoint. Do not commit `backend/.env`. If backend code needs to call local Supabase, set `SUPABASE_URL=http://host.docker.internal:54321` in that file and set `SUPABASE_SERVICE_ROLE_KEY` from the local `supabase status` output. Keep the service-role key server-side.

## Start Services

Start Supabase first. The CLI owns its Postgres, Auth, Studio, and Inbucket containers and their data volumes:

```powershell
pnpm exec supabase start
pnpm exec supabase status
```

Start the backend container using the existing development target in `backend/Dockerfile`:

```powershell
docker compose up --build -d backend
docker compose ps
```

Compose health-checks `GET /health`. Verify it from PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

The response should be `{ "status": "ok" }`. Supabase Studio is at `http://127.0.0.1:54323`; Inbucket's email UI is at `http://127.0.0.1:54324`.

## Ports

| Host port | Service                               | Owner          |
| --------- | ------------------------------------- | -------------- |
| `3000`    | Hono backend and `/health`            | Docker Compose |
| `54320`   | Supabase shadow database              | Supabase CLI   |
| `54321`   | Supabase API                          | Supabase CLI   |
| `54322`   | Supabase Postgres                     | Supabase CLI   |
| `54323`   | Supabase Studio                       | Supabase CLI   |
| `54324`   | Inbucket web UI                       | Supabase CLI   |
| `54325`   | Inbucket SMTP                         | Supabase CLI   |
| `54326`   | Inbucket POP3                         | Supabase CLI   |
| `54329`   | Supavisor pooler (disabled by config) | Supabase CLI   |

The ports are pinned in `supabase/config.toml`. Do not add a PostgreSQL service to Compose; start or inspect Supabase with `pnpm exec supabase start` and `pnpm exec supabase status`.

## Volumes

| Mount                                                       | Purpose                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| `./backend` to `/workspace/backend`                         | Live backend source and local `.env` for the development container.      |
| `./packages` to `/workspace/packages`                       | Live shared workspace source, including `@gfit/*` packages.              |
| `./tsconfig.base.json` to `/workspace/tsconfig.base.json`   | Shared TypeScript path/configuration, mounted read-only.                 |
| `backend_node_modules` to `/workspace/backend/node_modules` | Linux dependencies kept separate from host `node_modules`.               |
| Supabase CLI-managed Docker volumes                         | Local Postgres and Supabase service data; these are not Compose volumes. |

Stop the backend with `docker compose down`. Stop Supabase separately with `pnpm exec supabase stop`; that preserves its data. `pnpm exec supabase stop --no-backup` deletes the local Supabase data volumes.
