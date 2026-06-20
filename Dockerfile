# syntax=docker/dockerfile:1

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
# Install pnpm - COREPACK_ENABLE_STRICT=0 prevents version enforcement from packageManager field
ENV COREPACK_ENABLE_STRICT=0
RUN npm install -g pnpm@9
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/providers/package.json packages/providers/
COPY packages/model-router/package.json packages/model-router/
COPY packages/token-engine/package.json packages/token-engine/
COPY packages/cost-engine/package.json packages/cost-engine/
COPY packages/context-engine/package.json packages/context-engine/
COPY packages/workspace-engine/package.json packages/workspace-engine/
COPY packages/evaluator/package.json packages/evaluator/
COPY packages/orchestrator/package.json packages/orchestrator/
COPY apps/cli/package.json apps/cli/
COPY services/api/package.json services/api/

RUN pnpm install --no-frozen-lockfile --ignore-scripts

# ── Stage 2: builder ───────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY . .
RUN pnpm build

# ── Stage 3: api runtime ───────────────────────────────────────────────────────
FROM node:20-alpine AS api
RUN npm install -g pnpm@9
WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/providers/dist packages/providers/dist
COPY --from=builder /app/packages/providers/package.json packages/providers/
COPY --from=builder /app/packages/model-router/dist packages/model-router/dist
COPY --from=builder /app/packages/model-router/package.json packages/model-router/
COPY --from=builder /app/packages/token-engine/dist packages/token-engine/dist
COPY --from=builder /app/packages/token-engine/package.json packages/token-engine/
COPY --from=builder /app/packages/cost-engine/dist packages/cost-engine/dist
COPY --from=builder /app/packages/cost-engine/package.json packages/cost-engine/
COPY --from=builder /app/packages/context-engine/dist packages/context-engine/dist
COPY --from=builder /app/packages/context-engine/package.json packages/context-engine/
COPY --from=builder /app/packages/workspace-engine/dist packages/workspace-engine/dist
COPY --from=builder /app/packages/workspace-engine/package.json packages/workspace-engine/
COPY --from=builder /app/packages/evaluator/dist packages/evaluator/dist
COPY --from=builder /app/packages/evaluator/package.json packages/evaluator/
COPY --from=builder /app/packages/orchestrator/dist packages/orchestrator/dist
COPY --from=builder /app/packages/orchestrator/package.json packages/orchestrator/
COPY --from=builder /app/services/api/dist services/api/dist
COPY --from=builder /app/services/api/package.json services/api/

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node", "services/api/dist/index.js"]

# ── Stage 4: cli runtime ───────────────────────────────────────────────────────
FROM node:20-alpine AS cli
RUN npm install -g pnpm@9
WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/api ./services/api
COPY --from=builder /app/apps/cli ./apps/cli

# Create default output and state dirs
RUN mkdir -p /data/.refractiq /data/output

ENV NODE_ENV=production
ENV REFRACTIQ_DIR=/data/.refractiq

WORKDIR /data
ENTRYPOINT ["node", "/app/apps/cli/dist/bin/cli.js"]
CMD ["--help"]
