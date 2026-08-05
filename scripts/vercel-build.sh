#!/usr/bin/env bash
# Vercel build: generate the Prisma client, bring the database up to date,
# seed demo data on a fresh database, then build Next.js.
set -euo pipefail

# Schema changes go over the unpooled Neon endpoint — pgbouncer does not play
# nicely with the advisory locks Prisma Migrate takes out.
MIGRATE_URL="${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}"

npx prisma generate

if [ -z "$MIGRATE_URL" ]; then
  echo "· No DATABASE_URL available at build time — skipping migrate and seed."
else
  # If a previous deploy left a migration in the failed state, clear it so this
  # run can apply it again. Harmless (and expected to fail) otherwise.
  DATABASE_URL="$MIGRATE_URL" npx prisma migrate resolve --rolled-back 0_init 2>/dev/null || true

  DATABASE_URL="$MIGRATE_URL" npx prisma migrate deploy
  DATABASE_URL="$MIGRATE_URL" npx tsx prisma/seed-if-empty.ts
fi

npx next build
