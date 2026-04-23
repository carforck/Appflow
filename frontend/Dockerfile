# ── Stage 1: Dependencias desde el host (evita npm ci dentro del contenedor) ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# node_modules se copia desde el host (ya instalado con acceso a internet)
COPY node_modules ./node_modules

# ── Stage 2: Build de producción ─────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Runtime mínimo (solo archivos del standalone) ───────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001
CMD ["node", "server.js"]
