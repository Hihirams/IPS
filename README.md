# Ecommerce Tech

Monorepo de ecommerce de productos tecnológicos construido con **Next.js 14**, **Fastify**, **Prisma**, **PostgreSQL**, **Redis** y **Stripe**.

## Requisitos Previos

- **Node.js** >= 20 LTS ([Descargar](https://nodejs.org/))
- **pnpm** >= 8.0.0 ([Instalar](https://pnpm.io/installation))
  ```bash
  npm install -g pnpm@8.15.0
  ```
- **Docker** + **Docker Compose** ([Descargar](https://www.docker.com/products/docker-desktop))
- **Git**

## Arquitectura

```
ecommerce-tech/
├── apps/
│   ├── web/          # Next.js 14 (App Router) - Frontend
│   └── api/          # Fastify - Backend API
├── packages/
│   ├── ui/           # Componentes compartidos
│   ├── types/        # Tipos TypeScript compartidos
│   └── config/       # ESLint, Prettier, TSConfig, validación de ENV
├── docker-compose.yml
├── .env.example
└── package.json
```

## Primeros Pasos

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd ecommerce-tech
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y completa todos los valores. Consulta la tabla de variables abajo.

### 4. Levantar base de datos y cache

```bash
docker compose up -d postgres redis
```

### 5. Generar Prisma Client y aplicar migraciones

```bash
pnpm db:generate
pnpm db:migrate
```

### 6. Iniciar desarrollo

```bash
pnpm dev
```

Esto levanta:
- **Web**: http://localhost:3000
- **API**: http://localhost:4000
- **Prisma Studio**: http://localhost:5555

## Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | URL de conexión PostgreSQL |
| `REDIS_URL` | Sí | URL de conexión Redis |
| `JWT_SECRET` | Sí | Secret para firmar JWT (mín. 32 chars) |
| `JWT_REFRESH_SECRET` | Sí | Secret para refresh tokens (mín. 32 chars) |
| `STRIPE_SECRET_KEY` | Sí | Clave secreta de Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Sí* | Clave pública de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Sí | Secret para webhooks de Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Sí* | Clave pública expuesta al frontend |
| `CLOUDINARY_URL` | Sí* | URL de Cloudinary para imágenes |
| `CORS_ORIGIN` | No | Origen permitido CORS (default: http://localhost:3000) |
| `NODE_ENV` | No | development / production / test |
| `PORT` | No | Puerto del API (default: 4000) |
| `RATE_LIMIT_WINDOW_MS` | No | Ventana de rate limiting en ms (default: 900000) |
| `RATE_LIMIT_MAX` | No | Máximo de requests por ventana (default: 100) |

> *Requeridas en producción.

## Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia todos los servicios en modo desarrollo |
| `pnpm build` | Compila todas las aplicaciones |
| `pnpm lint` | Ejecuta ESLint en todo el monorepo |
| `pnpm lint:fix` | Corrige errores de lint automáticamente |
| `pnpm test` | Ejecuta tests en todo el monorepo |
| `pnpm type-check` | Verifica tipos TypeScript |
| `pnpm db:migrate` | Crea/aplica migraciones de Prisma |
| `pnpm db:generate` | Genera Prisma Client |
| `pnpm db:studio` | Abre Prisma Studio |
| `pnpm clean` | Elimina builds y node_modules |

## Seguridad

- **No usar `console.log` en producción**. Usar el logger estructurado (Pino) que redacta automáticamente secrets.
- **Nunca tocar datos de tarjeta**. Todo el flujo de pagos pasa por Stripe.
- **Variables críticas validadas al startup** con Zod (`packages/config/env.schema.ts`). La app falla inmediatamente si falta algo.
- **Headers de seguridad** configurados con `@fastify/helmet`.
- **Rate limiting** activo por defecto.

## Docker Compose

Levantar todo con Docker:

```bash
docker compose up -d
```

Esto inicia PostgreSQL, Redis, API y Web.

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| Backend | Fastify, TypeScript, Prisma ORM |
| Base de datos | PostgreSQL 16 |
| Cache / Sesiones | Redis 7 |
| Pagos | Stripe |
| Infraestructura | Docker, GitHub Actions |
| Linter / Formato | ESLint, Prettier |

## Licencia

Privado - Uso exclusivo del proyecto.
