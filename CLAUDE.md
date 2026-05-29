# CLAUDE.md — IPS Ecommerce Tech

## Project

Monorepo ecommerce tecnológico. pnpm workspaces. Node ≥20, pnpm ≥8.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui |
| Backend | Fastify, TypeScript, Prisma ORM |
| DB | PostgreSQL (Docker), Redis (cache) |
| Payments | Stripe |
| Monorepo | pnpm workspaces |

## Layout

```
apps/
  api/        # Fastify backend — port 4000
    src/
      modules/    # auth, cart, checkout, orders, products, admin, review, sync, user, gdpr
      routes/     # route registrations
      lib/        # shared utilities
      middleware/ # fastify middleware
      plugins/    # fastify plugins
      services/   # external service clients
    prisma/
      schema.prisma
      migrations/
      seed.ts
  web/        # Next.js 14 frontend — port 3000
    src/
      app/        # App Router pages
      components/
      lib/
packages/
  ui/         # shared React components
  types/      # shared TypeScript types
  config/     # ESLint, Prettier, TSConfig, ENV validation
```

## Dev commands

```bash
# Start everything
pnpm dev                          # web :3000 + api :4000 in parallel

# DB
docker compose up -d postgres redis
pnpm db:generate                  # prisma generate
pnpm db:migrate                   # prisma migrate dev
pnpm db:seed                      # seed data
pnpm db:studio                    # prisma studio :5555

# Individual apps
pnpm --filter @ecommerce/api dev
pnpm --filter @ecommerce/web dev

# Sync product catalog from Syscom
pnpm --filter @ecommerce/api sync:catalog

# Build / lint / test
pnpm build
pnpm lint
pnpm test
pnpm type-check
```

## Package names

- `@ecommerce/api`
- `@ecommerce/web`
- `@ecommerce/ui`
- `@ecommerce/types`
- `@ecommerce/config`

## Key files

| File | Purpose |
|---|---|
| `apps/api/src/index.ts` | Fastify server entry |
| `apps/api/prisma/schema.prisma` | DB schema (single source of truth) |
| `apps/web/src/middleware.ts` | Next.js middleware (auth guards) |
| `docker-compose.yml` | Postgres + Redis |
| `docker-compose.dev.yml` | Dev overrides |
| `.env` | Local secrets (never commit) |

## API modules

`auth` `cart` `checkout` `orders` `products` `admin` `review` `sync` `user` `gdpr`

Each module = routes + schema (Zod) + service logic.

## Caveman mode

Installed via `JuliusBrussee/caveman` Claude Code plugin.
Say `/caveman` to activate compressed responses (~75% fewer output tokens).
Levels: `lite` | `full` (default) | `ultra`.
Say "normal mode" to stop.

## Rules for Claude

- Always use `pnpm`, never `npm`/`yarn`
- Prisma is ORM — no raw SQL unless migration file
- Shared types go in `packages/types`
- Shared components go in `packages/ui`
- Use `@ecommerce/*` workspace imports
- API validation uses Zod schemas (fastify-zod pattern)
- Frontend state: React hooks + server components where possible
- No `any` types
- Run `pnpm type-check` before considering done
