# ════════════════════════════════════════════════════════════
#  Phoenix — Dockerfile for Google Cloud Run
#  Multi-stage build: build stage compiles frontend + server,
#  production stage runs only the compiled output.
# ════════════════════════════════════════════════════════════

# ── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (layer cache: only re-installs if deps change)
COPY package*.json ./

# Install ALL deps (including devDependencies — needed for build)
RUN npm install

# Copy source
COPY . .

# Build: vite builds the frontend, esbuild bundles server.ts
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Only copy package files and install PRODUCTION deps
COPY package*.json ./
RUN npm install --omit=dev

# Copy the compiled output from builder
COPY --from=builder /app/dist ./dist

# Cloud Run injects PORT env var (usually 8080) — your server already
# reads process.env.PORT so this just makes the contract explicit.
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# server.cjs is the esbuild-compiled Express server
CMD ["node", "dist/server.cjs"]