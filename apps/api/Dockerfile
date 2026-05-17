# ==========================================
# Etapa 1: Dependencias
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar archivos de workspace para instalar dependencias
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

# Instalar pnpm y dependencias
RUN npm install -g pnpm@8.15.0 && pnpm install --frozen-lockfile

# ==========================================
# Etapa 2: Builder
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@8.15.0
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

# Generar Prisma Client y compilar
RUN pnpm --filter @ecommerce/api prisma:generate
RUN pnpm --filter @ecommerce/api build

# ==========================================
# Etapa 3: Runner (producción)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 api

# Copiar solo lo necesario
COPY --from=builder --chown=api:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=api:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=api:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=api:nodejs /app/packages ./packages

# Script de inicio: corre migraciones y luego arranca el servidor
COPY --from=builder --chown=api:nodejs /app/apps/api/start.sh /app/start.sh
RUN chmod +x /app/start.sh

USER api

EXPOSE 4000

ENV PORT=4000

CMD ["/app/start.sh"]
