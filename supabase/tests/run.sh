#!/usr/bin/env bash
# Applies the migrations to a throwaway database and runs the SQL tests.
# Needs psql and a Postgres server with PostGIS; connection via the usual PG* env vars.
set -euo pipefail
cd "$(dirname "$0")/.."

db="pax_test_$$"
createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT

psql -q -v ON_ERROR_STOP=1 -d "$db" -f tests/supabase_stubs.sql
for f in migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$f"
done
for f in tests/*_test.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$f"
done
