#!/bin/sh
# Production entrypoint for @powerlog/api.
# Always applies pending DB migrations before starting the server. The migrator
# is idempotent (it diffs the committed migrations against the __drizzle_migrations
# table) so running it on every container start is safe — including when
# Watchtower recreates the container after an image update. A failed migration
# exits non-zero, so the app never starts against a half-migrated schema.
set -e

echo "[entrypoint] running database migrations…"
node dist/db/migrate.js

echo "[entrypoint] starting API…"
exec node dist/main.js
