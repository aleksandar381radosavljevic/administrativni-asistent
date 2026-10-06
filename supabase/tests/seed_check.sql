-- =============================================================================
-- Seed check: the generated test seed loads, is publicly visible as intended
-- and is marked as test content (ADR 0015). Read-only.
-- Requires the schema and supabase/seed.sql to be loaded (see README.md).
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\pset format unaligned
SET client_min_messages = notice;

BEGIN;

CREATE FUNCTION pg_temp.expect_value(label text, query text, expected text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  actual text;
BEGIN
  EXECUTE query INTO actual;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'FAIL: % expected [%] got [%]', label, expected, actual;
  END IF;
  RAISE NOTICE 'PASS: % (= %)', label, expected;
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO anon;

\echo '== Seed: every record is marked as test content'
SELECT pg_temp.expect_value('every category name starts with [TEST]',
  $q$SELECT count(*)::text FROM categories WHERE name NOT LIKE '[TEST] %'$q$, '0');
SELECT pg_temp.expect_value('every institution name starts with [TEST]',
  $q$SELECT count(*)::text FROM institutions WHERE name NOT LIKE '[TEST] %'$q$, '0');
SELECT pg_temp.expect_value('every life event title starts with [TEST]',
  $q$SELECT count(*)::text FROM life_events WHERE title NOT LIKE '[TEST] %'$q$, '0');
SELECT pg_temp.expect_value('every procedure title starts with [TEST]',
  $q$SELECT count(*)::text FROM procedures WHERE title NOT LIKE '[TEST] %'$q$, '0');

\echo '== Seed: published content is visible to anon'
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true); END $$;
SET LOCAL ROLE anon;
SELECT pg_temp.expect_value('anon sees the published life events',
  $q$SELECT count(*)::text FROM life_events$q$, '5');
SELECT pg_temp.expect_value('anon sees the published procedures',
  $q$SELECT count(*)::text FROM procedures$q$, '5');
SELECT pg_temp.expect_value('anon sees both categories',
  $q$SELECT string_agg(slug, ',' ORDER BY sort_order) FROM categories$q$,
  'licna-dokumenta,preseljenje-i-adresa');
SELECT pg_temp.expect_value('the moving event keeps its dependency',
  $q$SELECT count(*)::text FROM procedure_dependencies pd
      JOIN life_events e ON e.id = pd.life_event_id WHERE e.slug = 'selim-se-na-novu-adresu'$q$, '1');
SELECT pg_temp.expect_value('fixed cost survives as a two-decimal amount',
  $q$SELECT cost_amount::text FROM procedures WHERE slug = 'pasosh'$q$, '3000.00');
SELECT pg_temp.expect_value('"pasos" finds the passport procedure',
  $q$SELECT string_agg(slug, ',') FROM search_content('pasos') WHERE kind = 'procedure'$q$, 'pasosh');
RESET ROLE;

\echo '== Seed check passed'
ROLLBACK;
