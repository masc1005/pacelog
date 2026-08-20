# Multi-stage Dockerfile para apps/backend no Railway / Docker
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Build stage
FROM dependencies AS builder
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
COPY turbo.json ./
RUN pnpm --filter @pacelog/shared build && pnpm --filter @pacelog/backend build

# Production Runner
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/backend

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json

EXPOSE 3333
CMD ["node", "dist/server.js"]
