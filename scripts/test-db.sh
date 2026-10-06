#!/usr/bin/env bash
# SQL tests (ADR 0009): schema smoke test, then seed check.
#
#   TEST_DB_URL=postgresql://... npm run test:db
#       Plain PostgreSQL 16 database that the script may fill (throwaway; CI
#       uses a service container). Loads the Supabase stand-ins, every
#       migration, runs the smoke test, loads the seed and checks it.
#
#   npm run test:db -- --supabase
#       Local Supabase stack (`supabase start`). Resets the database without
#       the seed, runs the smoke test, then resets again with the seed and
#       checks it. Why two resets: the smoke test counts rows and expects an
#       empty schema.
set -euo pipefail

cd "$(dirname "$0")/.."
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

if [[ "${1:-}" == "--supabase" ]]; then
  URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
  npx supabase db reset --local --no-seed
  "${PSQL[@]}" "$URL" -f supabase/tests/schema_smoke.sql
  npx supabase db reset --local
  "${PSQL[@]}" "$URL" -f supabase/tests/seed_check.sql
  exit 0
fi

: "${TEST_DB_URL:?Set TEST_DB_URL to a throwaway PostgreSQL 16 database, or pass --supabase}"

# The stand-ins create roles and the auth schema; never run them on Supabase.
"${PSQL[@]}" "$TEST_DB_URL" -f supabase/tests/bare_postgres_stubs.sql
for migration in supabase/migrations/*.sql; do
  "${PSQL[@]}" "$TEST_DB_URL" -f "$migration"
done
"${PSQL[@]}" "$TEST_DB_URL" -f supabase/tests/schema_smoke.sql
"${PSQL[@]}" "$TEST_DB_URL" -f supabase/seed.sql
"${PSQL[@]}" "$TEST_DB_URL" -f supabase/tests/seed_check.sql
