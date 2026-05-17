#!/bin/sh
set -e
echo "Generating Prisma Client..."
./node_modules/.bin/prisma generate
echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy
echo "Starting server..."
exec node dist/index.js