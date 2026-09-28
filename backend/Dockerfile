FROM node:24.19.0-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@11.26.0 --activate

FROM base AS workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY backend ./backend
COPY packages ./packages

FROM workspace AS development

EXPOSE 3000

CMD ["pnpm", "--filter", "backend", "dev"]

FROM workspace AS build

RUN pnpm --filter backend build

FROM base AS production-dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --prod --frozen-lockfile --filter backend...

FROM base AS production

COPY --from=production-dependencies /workspace/node_modules ./node_modules
COPY --from=production-dependencies /workspace/backend/node_modules ./backend/node_modules
COPY --from=build /workspace/backend/dist ./backend/dist
COPY --from=build /workspace/packages ./packages
COPY --from=build /workspace/backend/package.json ./backend/package.json

USER node

EXPOSE 3000

CMD ["node", "backend/dist/server.js"]