# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:18 AS builder

WORKDIR /app

# Copy everything
COPY . .

# ── Frontend ──────────────────────────────────────────────────────────────────
RUN npm ci
RUN npm run build
# Frontend build output → /app/dist

# ── Backend ───────────────────────────────────────────────────────────────────
WORKDIR /app/backend
RUN npm ci
RUN npm run build
# Backend build output → /app/backend/dist
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate
# Compile the production init seed (outputs to /app/backend/dist-seed)
RUN npx tsc --project tsconfig.seed.json

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:18-slim AS runner

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy compiled backend + prisma client
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/dist-seed ./dist-seed
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package.json ./package.json

# Copy compiled frontend (served as static files by Express)
COPY --from=builder /app/dist /app/dist

ENV NODE_ENV=production
EXPOSE 3001

# 1. Run DB migrations  2. Seed initial accounts if empty  3. Start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist-seed/seed-init.js && node dist/server.js"]
