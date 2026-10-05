-- =============================================================================
-- Schema smoke test: RLS, audit, integrity triggers, AI tables, search.
-- Runs in one transaction and rolls back, so it leaves no data behind.
-- Prints "PASS: ..." per check and stops at the first "FAIL: ...".
-- Requires docs/01-domain-model.sql to be loaded (see README.md).
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\pset format unaligned
SET client_min_messages = notice;

BEGIN;

-- ---- Assertion helpers (temporary, run as the caller) ------------------------

CREATE FUNCTION pg_temp.expect_error(label text, stmt text, codes text[])
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
    EXECUTE 'SET CONSTRAINTS ALL IMMEDIATE';  -- fire deferred publish checks now
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = ANY (codes) THEN
      RAISE NOTICE 'PASS: % [% %]', label, SQLSTATE, SQLERRM;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL: % raised unexpected % %', label, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'FAIL: % succeeded but must be rejected', label;
END;
$$;

CREATE FUNCTION pg_temp.expect_ok(label text, stmt text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  EXECUTE 'SET CONSTRAINTS ALL IMMEDIATE';
  EXECUTE 'SET CONSTRAINTS ALL DEFERRED';
  RAISE NOTICE 'PASS: %', label;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'FAIL: % raised % %', label, SQLSTATE, SQLERRM;
END;
$$;

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

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO anon, authenticated, service_role;

-- Role switches. Claims mirror what PostgREST sets from the JWT.
CREATE FUNCTION pg_temp.as_anon() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
END; $$;

CREATE FUNCTION pg_temp.as_user() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{}}', true);
  SET LOCAL ROLE authenticated;
END; $$;

CREATE FUNCTION pg_temp.as_admin() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"admin"}}', true);
  SET LOCAL ROLE authenticated;
END; $$;

CREATE FUNCTION pg_temp.as_service() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  SET LOCAL ROLE service_role;
END; $$;

CREATE FUNCTION pg_temp.as_owner() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
  RESET ROLE;
END; $$;

-- ---- Fixtures (database owner, like a seed migration) -----------------------
-- c...01 has a published event, c...02 only a draft one.
-- Procedures: d01 pasoš (pub), d02 prebivalište (pub), d03 draft, d04 published
-- but in no published event, d05 pub, d06 rođenih (pub).
-- Events: e01 published (d01,d02,d03,d05,d06), e02 draft (d04),
-- e03 published (d01,d02).

INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@example.test'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'user@example.test');

INSERT INTO categories (id, name, slug, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Lična dokumenta', 'licna-dokumenta', 1),
  ('c0000000-0000-0000-0000-000000000002', 'Skrivena kategorija', 'skrivena', 2);

INSERT INTO institutions (id, name, slug, kind, address, status) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'MUP Srbije', 'mup-srbije', 'government', 'Kneza Miloša 101, Beograd', 'published');

INSERT INTO procedures (id, title, slug, cost_type, cost_amount, status) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Izdavanje pasoša',               'izdavanje-pasosa',      'fixed', 5800.00, 'published'),
  ('d0000000-0000-0000-0000-000000000002', 'Prijava prebivališta',           'prijava-prebivalista',  'free',  NULL,    'published'),
  ('d0000000-0000-0000-0000-000000000003', 'Tajna procedura',                'tajna-procedura',       'unknown', NULL,  'draft'),
  ('d0000000-0000-0000-0000-000000000004', 'Nevezana procedura',             'nevezana-procedura',    'unknown', NULL,  'published'),
  ('d0000000-0000-0000-0000-000000000005', 'Zamena vozačke dozvole',         'zamena-vozacke',        'variable', NULL, 'published'),
  ('d0000000-0000-0000-0000-000000000006', 'Izvod iz matične knjige rođenih','izvod-rodjenih',        'unknown', NULL,  'published');

INSERT INTO steps (procedure_id, sort_order, title, description)
SELECT id, 1, 'Zakaži termin', 'Opis koraka' FROM procedures;

INSERT INTO documents (procedure_id, sort_order, name)
SELECT id, 1, 'Lična karta' FROM procedures;

INSERT INTO procedure_institutions (procedure_id, institution_id)
SELECT id, 'b0000000-0000-0000-0000-000000000001' FROM procedures;

INSERT INTO life_events (id, category_id, title, slug, estimated_duration, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Selim se',        'selim-se',   '~2 nedelje', 'published'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Nacrt događaja',  'nacrt',      NULL,         'draft'),
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Putujem',         'putujem',    NULL,         'published');

INSERT INTO life_event_procedures (life_event_id, procedure_id, sort_order) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 1),
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 2),
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 3),
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 4),
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006', 5),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000004', 1),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 1),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 2);

-- d02 depends on d01; d05 depends on the draft d03 (must be hidden publicly).
INSERT INTO procedure_dependencies (life_event_id, procedure_id, depends_on_id) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000003');

INSERT INTO synonyms (term, maps_to) VALUES ('putna isprava', 'pasoš');

SET CONSTRAINTS ALL IMMEDIATE;  -- fixtures satisfy the publish rules
SET CONSTRAINTS ALL DEFERRED;

\echo '== 1. Anonymous reads: published content only'
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_value('anon sees only published life events',
  $q$SELECT string_agg(slug, ',' ORDER BY slug) FROM life_events$q$, 'putujem,selim-se');
SELECT pg_temp.expect_value('anon sees no draft procedure and no procedure outside a published event (PR-05)',
  $q$SELECT string_agg(slug, ',' ORDER BY slug) FROM procedures$q$,
  'izdavanje-pasosa,izvod-rodjenih,prijava-prebivalista,zamena-vozacke');
SELECT pg_temp.expect_value('anon cannot read steps of draft or unlinked procedures',
  $q$SELECT count(*)::text FROM steps WHERE procedure_id IN ('d0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004')$q$, '0');
SELECT pg_temp.expect_value('anon cannot read documents of draft or unlinked procedures',
  $q$SELECT count(*)::text FROM documents WHERE procedure_id IN ('d0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004')$q$, '0');
SELECT pg_temp.expect_value('anon reads steps of public procedures',
  $q$SELECT count(*)::text FROM steps$q$, '4');
SELECT pg_temp.expect_value('anon sees no link rows of the draft event or draft procedure',
  $q$SELECT count(*)::text FROM life_event_procedures$q$, '6');
SELECT pg_temp.expect_value('anon does not see the dependency on a draft procedure',
  $q$SELECT count(*)::text FROM procedure_dependencies$q$, '1');
SELECT pg_temp.expect_value('anon sees only categories with a published event',
  $q$SELECT string_agg(slug, ',') FROM categories$q$, 'licna-dokumenta');
SELECT pg_temp.expect_error('anon cannot read ai_queries',     'SELECT * FROM ai_queries',     ARRAY['42501']);
SELECT pg_temp.expect_error('anon cannot read audit_log',      'SELECT * FROM audit_log',      ARRAY['42501']);
SELECT pg_temp.expect_error('anon cannot read ai_rate_limits', 'SELECT * FROM ai_rate_limits', ARRAY['42501']);

\echo '== 2. Anonymous and non-admin writes are rejected'
SELECT pg_temp.expect_error('anon cannot insert a procedure',
  $q$INSERT INTO procedures (title, slug) VALUES ('X', 'x')$q$, ARRAY['42501']);
SELECT pg_temp.expect_error('anon cannot update a life event',
  $q$UPDATE life_events SET title = 'X'$q$, ARRAY['42501']);
SELECT pg_temp.expect_error('anon cannot insert into ai_queries',
  $q$INSERT INTO ai_queries (query_text) VALUES ('x')$q$, ARRAY['42501']);
SELECT pg_temp.expect_error('anon cannot truncate steps (TRUNCATE ignores RLS)',
  'TRUNCATE steps CASCADE', ARRAY['42501']);
SELECT pg_temp.expect_error('anon cannot call ai_rate_limit_hit',
  $q$SELECT ai_rate_limit_hit(repeat('a', 64), 10)$q$, ARRAY['42501']);
SELECT pg_temp.as_owner();
SELECT pg_temp.as_user();
SELECT pg_temp.expect_value('non-admin user does not see drafts',
  $q$SELECT count(*)::text FROM procedures WHERE status = 'draft'$q$, '0');
SELECT pg_temp.expect_error('non-admin user cannot insert a procedure',
  $q$INSERT INTO procedures (title, slug) VALUES ('X', 'x')$q$, ARRAY['42501']);
SELECT pg_temp.expect_value('non-admin user reads no audit_log rows',
  $q$SELECT count(*)::text FROM audit_log$q$, '0');
SELECT pg_temp.expect_value('non-admin user reads no ai_queries rows',
  $q$SELECT count(*)::text FROM ai_queries$q$, '0');
SELECT pg_temp.as_owner();

\echo '== 3. Admin writes are allowed and audited with auth.uid()'
SELECT pg_temp.as_admin();
SELECT pg_temp.expect_value('admin sees drafts',
  $q$SELECT count(*)::text FROM procedures$q$, '6');
SELECT pg_temp.expect_ok('admin creates a draft procedure',
  $q$INSERT INTO procedures (id, title, slug) VALUES ('d0000000-0000-0000-0000-000000000099', 'Nova procedura', 'nova-procedura')$q$);
SELECT pg_temp.expect_value('create is audited with the admin id',
  $q$SELECT action || ':' || changed_by FROM audit_log WHERE entity_id = 'd0000000-0000-0000-0000-000000000099'$q$,
  'create:aaaaaaaa-0000-0000-0000-000000000001');
SELECT pg_temp.expect_value('created_by is set from auth.uid()',
  $q$SELECT created_by::text FROM procedures WHERE id = 'd0000000-0000-0000-0000-000000000099'$q$,
  'aaaaaaaa-0000-0000-0000-000000000001');
SELECT pg_temp.expect_ok('admin updates the procedure title',
  $q$UPDATE procedures SET title = 'Nova procedura 2' WHERE id = 'd0000000-0000-0000-0000-000000000099'$q$);
SELECT pg_temp.expect_value('update is audited with an old/new diff',
  $q$SELECT diff -> 'title' ->> 'old' || ' -> ' || (diff -> 'title' ->> 'new') FROM audit_log
      WHERE entity_id = 'd0000000-0000-0000-0000-000000000099' AND action = 'update'$q$,
  'Nova procedura -> Nova procedura 2');
SELECT pg_temp.expect_ok('admin archives the procedure',
  $q$UPDATE procedures SET status = 'archived' WHERE id = 'd0000000-0000-0000-0000-000000000099'$q$);
SELECT pg_temp.expect_value('archive is audited as archive',
  $q$SELECT count(*)::text FROM audit_log WHERE entity_id = 'd0000000-0000-0000-0000-000000000099' AND action = 'archive'$q$, '1');
SELECT pg_temp.expect_error('admin cannot delete a procedure (archive instead)',
  $q$DELETE FROM procedures WHERE id = 'd0000000-0000-0000-0000-000000000099'$q$, ARRAY['42501']);
SELECT pg_temp.expect_error('admin cannot delete a category',
  $q$DELETE FROM categories WHERE slug = 'skrivena'$q$, ARRAY['42501']);
SELECT pg_temp.expect_ok('admin adds a step',
  $q$WITH s AS (INSERT INTO steps (id, procedure_id, sort_order, title, description)
                VALUES ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 2, 'Drugi', 'Opis') RETURNING id)
     SELECT 1$q$);
SELECT pg_temp.expect_ok('admin deletes a step',
  $q$DELETE FROM steps WHERE id = 'f0000000-0000-0000-0000-000000000001'$q$);
SELECT pg_temp.expect_value('step delete is audited',
  $q$SELECT count(*)::text FROM audit_log WHERE entity_id = 'f0000000-0000-0000-0000-000000000001' AND action = 'delete'$q$, '1');
SELECT pg_temp.expect_ok('admin removes a procedure from an event',
  $q$DELETE FROM life_event_procedures WHERE life_event_id = 'e0000000-0000-0000-0000-000000000001' AND procedure_id = 'd0000000-0000-0000-0000-000000000006'$q$);
SELECT pg_temp.expect_value('link-row delete is audited under the life event id',
  $q$SELECT count(*)::text FROM audit_log WHERE entity_type = 'life_event_procedures' AND action = 'delete'
      AND entity_id = 'e0000000-0000-0000-0000-000000000001'$q$, '1');
SELECT pg_temp.expect_ok('admin creates a synonym',
  $q$WITH a AS (INSERT INTO synonyms (id, term, maps_to) VALUES ('f0000000-0000-0000-0000-000000000002', 'karton', 'izvod') RETURNING id)
     SELECT 1$q$);
SELECT pg_temp.expect_ok('admin deletes the synonym (audited as delete)',
  $q$DELETE FROM synonyms WHERE id = 'f0000000-0000-0000-0000-000000000002'$q$);
SELECT pg_temp.expect_value('synonym delete is audited',
  $q$SELECT count(*)::text FROM audit_log WHERE entity_id = 'f0000000-0000-0000-0000-000000000002' AND action = 'delete'$q$, '1');
SELECT pg_temp.expect_error('admin cannot insert into audit_log directly',
  $q$INSERT INTO audit_log (entity_type, entity_id, action) VALUES ('x', gen_random_uuid(), 'create')$q$, ARRAY['42501']);
SELECT pg_temp.expect_error('admin cannot update audit_log',
  $q$UPDATE audit_log SET entity_type = 'x'$q$, ARRAY['42501']);
SELECT pg_temp.expect_error('admin cannot delete audit_log',
  $q$DELETE FROM audit_log$q$, ARRAY['42501']);
SELECT pg_temp.as_owner();
SELECT pg_temp.expect_error('even the owner cannot delete audit_log rows',
  $q$DELETE FROM audit_log$q$, ARRAY['42501']);
SELECT pg_temp.expect_error('even the owner cannot truncate audit_log',
  $q$TRUNCATE audit_log$q$, ARRAY['42501']);

\echo '== 4. Dependency rules'
SELECT pg_temp.as_admin();
SELECT pg_temp.expect_error('two-node cycle is rejected (d01 -> d02 while d02 -> d01)',
  $q$INSERT INTO procedure_dependencies VALUES ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002')$q$,
  ARRAY['23514']);
SELECT pg_temp.expect_ok('chain d05 -> d02 is accepted',
  $q$INSERT INTO procedure_dependencies VALUES ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002')$q$);
SELECT pg_temp.expect_error('three-node cycle is rejected (d01 -> d05 -> d02 -> d01)',
  $q$INSERT INTO procedure_dependencies VALUES ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005')$q$,
  ARRAY['23514']);
SELECT pg_temp.expect_error('cycle created by UPDATE is rejected',
  $q$UPDATE procedure_dependencies SET procedure_id = 'd0000000-0000-0000-0000-000000000001', depends_on_id = 'd0000000-0000-0000-0000-000000000005'
      WHERE life_event_id = 'e0000000-0000-0000-0000-000000000001' AND procedure_id = 'd0000000-0000-0000-0000-000000000005' AND depends_on_id = 'd0000000-0000-0000-0000-000000000003'$q$,
  ARRAY['23514']);
SELECT pg_temp.expect_error('self dependency is rejected',
  $q$INSERT INTO procedure_dependencies VALUES ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001')$q$,
  ARRAY['23514']);
SELECT pg_temp.expect_error('dependency on a procedure outside the event is rejected',
  $q$INSERT INTO procedure_dependencies VALUES ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005')$q$,
  ARRAY['23503']);
SELECT pg_temp.expect_ok('the same pair in reverse is fine in another event (dependencies are per event)',
  $q$INSERT INTO procedure_dependencies VALUES ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002')$q$);

\echo '== 5. Publish rules'
SELECT pg_temp.expect_error('event with zero procedures cannot be published (PR-04)',
  $q$INSERT INTO life_events (category_id, title, slug, status) VALUES ('c0000000-0000-0000-0000-000000000001', 'Prazan', 'prazan', 'published')$q$,
  ARRAY['23514']);
SELECT pg_temp.expect_error('event with only draft procedures cannot be published',
  $q$WITH e AS (INSERT INTO life_events (id, category_id, title, slug, status) VALUES ('e0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000001', 'Samo nacrt', 'samo-nacrt', 'published') RETURNING id)
     INSERT INTO life_event_procedures VALUES ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000003', 1)$q$,
  ARRAY['23514']);
SELECT pg_temp.expect_ok('event created, linked and published in one transaction',
  $q$WITH e AS (INSERT INTO life_events (id, category_id, title, slug, status) VALUES ('e0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000001', 'Novi', 'novi', 'published') RETURNING id)
     INSERT INTO life_event_procedures VALUES ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 1)$q$);
SELECT pg_temp.expect_error('removing the last procedure of a published event is rejected',
  $q$DELETE FROM life_event_procedures WHERE life_event_id = 'e0000000-0000-0000-0000-000000000008'$q$,
  ARRAY['23514']);
SELECT pg_temp.expect_error('archiving the only published procedure of a published event is rejected',
  $q$UPDATE procedures SET status = 'archived' WHERE id = 'd0000000-0000-0000-0000-000000000001'$q$,
  ARRAY['23514']);
SELECT pg_temp.expect_error('procedure without steps cannot be published (PR-01)',
  $q$INSERT INTO procedures (title, slug, status) VALUES ('Bez koraka', 'bez-koraka', 'published')$q$,
  ARRAY['23514']);
SELECT pg_temp.expect_error('fixed cost needs an amount',
  $q$INSERT INTO procedures (title, slug, cost_type) VALUES ('X', 'x1', 'fixed')$q$, ARRAY['23514']);
SELECT pg_temp.expect_error('free cost cannot carry an amount',
  $q$INSERT INTO procedures (title, slug, cost_type, cost_amount) VALUES ('X', 'x2', 'free', 100)$q$, ARRAY['23514']);
SELECT pg_temp.as_owner();
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_value('procedure removed from its only event is no longer public',
  $q$SELECT count(*)::text FROM procedures WHERE slug = 'izvod-rodjenih'$q$, '0');
SELECT pg_temp.as_owner();

\echo '== 6. Service role and AI tables'
SELECT pg_temp.as_service();
SELECT pg_temp.expect_error('service role cannot write content (ADR 0004)',
  $q$INSERT INTO procedures (title, slug) VALUES ('X', 'x3')$q$, ARRAY['42501']);
SELECT pg_temp.expect_ok('service role inserts a redacted ai_query',
  $q$INSERT INTO ai_queries (query_text, was_answered, matched_event_id) VALUES ('Selim se, JMBG [JMBG], šta mi treba?', true, 'e0000000-0000-0000-0000-000000000001')$q$);
SELECT pg_temp.expect_error('an unredacted JMBG is rejected',
  $q$INSERT INTO ai_queries (query_text) VALUES ('moj jmbg je 0101990710123')$q$, ARRAY['23514']);
SELECT pg_temp.expect_error('service role cannot delete ai_queries',
  $q$DELETE FROM ai_queries$q$, ARRAY['42501']);
SELECT pg_temp.expect_value('rate limit: requests 1-3 with limit 2',
  $q$SELECT string_agg(ai_rate_limit_hit(repeat('ab', 32), 2)::text, ',') FROM generate_series(1, 3)$q$,
  'true,true,false');
SELECT pg_temp.expect_error('rate limit rejects a raw IP',
  $q$SELECT ai_rate_limit_hit('192.168.1.1', 10)$q$, ARRAY['23514']);
SELECT pg_temp.as_owner();
SELECT pg_temp.as_admin();
SELECT pg_temp.expect_value('admin reads ai_queries (UF-10)',
  $q$SELECT count(*)::text FROM ai_queries$q$, '1');
SELECT pg_temp.expect_error('admin cannot read ai_rate_limits',
  'SELECT * FROM ai_rate_limits', ARRAY['42501']);
SELECT pg_temp.as_owner();
INSERT INTO ai_queries (query_text, created_at) VALUES ('stari upit', now() - interval '91 days');
INSERT INTO ai_rate_limits VALUES (repeat('cd', 32), date_trunc('hour', now()) - interval '2 hours', 5);
SELECT pg_temp.expect_value('retention purges only ai_queries older than 90 days',
  $q$SELECT private.purge_expired_ai_data()::text$q$, '1');
SELECT pg_temp.expect_value('retention purges expired rate-limit windows only',
  $q$SELECT string_agg(left(ip_hash, 2), ',') FROM ai_rate_limits$q$, 'ab');

\echo '== 7. Search (anon)'
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_value('"pasos" (no diacritics) finds Izdavanje pasoša',
  $q$SELECT string_agg(slug, ',') FROM search_content('pasos') WHERE kind = 'procedure'$q$, 'izdavanje-pasosa');
SELECT pg_temp.expect_value('"пасош" (Cyrillic) finds Izdavanje pasoša',
  $q$SELECT string_agg(slug, ',') FROM search_content('пасош') WHERE kind = 'procedure'$q$, 'izdavanje-pasosa');
SELECT pg_temp.expect_value('"pasoš" finds Izdavanje pasoša',
  $q$SELECT string_agg(slug, ',') FROM search_content('pasoš') WHERE kind = 'procedure'$q$, 'izdavanje-pasosa');
SELECT pg_temp.expect_value('"ПРЕБИВАЛИШТЕ" (Cyrillic caps) finds Prijava prebivališta',
  $q$SELECT string_agg(slug, ',') FROM search_content('ПРЕБИВАЛИШТЕ') WHERE kind = 'procedure'$q$, 'prijava-prebivalista');
SELECT pg_temp.expect_value('synonym "putna isprava" finds Izdavanje pasoša',
  $q$SELECT string_agg(slug, ',') FROM search_content('putna isprava') WHERE kind = 'procedure'$q$, 'izdavanje-pasosa');
SELECT pg_temp.expect_value('search never returns draft or unlinked procedures',
  $q$SELECT count(*)::text FROM search_content('procedura')$q$, '0');
SELECT pg_temp.expect_value('"vozacke" finds Zamena vozačke dozvole',
  $q$SELECT string_agg(slug, ',') FROM search_content('vozacke') WHERE kind = 'procedure'$q$, 'zamena-vozacke');
SELECT pg_temp.as_owner();
SELECT pg_temp.expect_value('đ normalizes to dj: "rodjenih" = "рођених" = "rođenih"',
  $q$SELECT (aa_normalize('rodjenih') = aa_normalize('рођених') AND aa_normalize('rođenih') = aa_normalize('rodjenih'))::text$q$, 'true');

\echo '== All checks passed'
ROLLBACK;
