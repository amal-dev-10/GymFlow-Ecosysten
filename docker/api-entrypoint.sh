#!/bin/sh
# Entrypoint for the API container: sync the database schema, then boot.
set -e

echo "[api] Syncing database schema (prisma db push)..."
# No migrations directory in this repo — push the schema to bring the DB in
# sync. --skip-generate because the client is already generated in the image.
( cd /app/packages/database && npx prisma db push --skip-generate )

echo "[api] Running automatic database seeds..."
node /app/packages/database/run-seeds.js

echo "[api] Starting NestJS server on port ${PORT:-5000}..."
exec node /app/apps/api/dist/main
