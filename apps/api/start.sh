#!/bin/sh
set -e

PRISMA_BIN="/app/apps/api/node_modules/.bin/prisma"
SCHEMA_PATH="/app/prisma/schema.prisma"

echo "Generating Prisma Client..."
"$PRISMA_BIN" generate --schema="$SCHEMA_PATH"
echo "Running database migrations..."
"$PRISMA_BIN" migrate deploy --schema="$SCHEMA_PATH"
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Seeding database..."
  /app/apps/api/node_modules/.bin/tsx /app/prisma/seed.ts
fi
echo "Starting server..."
exec node dist/index.js
