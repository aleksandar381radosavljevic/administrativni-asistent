-- =============================================================================
-- Administrativni Asistent: database schema
-- Version 1.1 (2026-10-05). Target: PostgreSQL 15+ on Supabase (tested on 16).
-- Companion document: docs/01-domain-model.md
-- Tests: supabase/tests/schema_smoke.sql
-- =============================================================================
-- Ground rules (see 01-domain-model.md for the reasoning):
--   * Content entities (life_events, institutions, procedures) are never
--     deleted; they move to status = 'archived'. Child and link rows (steps,
--     documents, synonyms, link tables) may be deleted by an admin, and every
--     delete is audited.
--   * RLS is enabled on every table. anon/authenticated see only what is
--     publicly visible (published, and for procedures linked to a published
--     life event, PR-05). Admins (JWT app_metadata.role = 'admin') write with
--     their own JWT, never the service role (ADR 0004).
--   * Every content change is written to audit_log by a trigger using
--     auth.uid(). audit_log is append-only for every role.
--   * ai_queries holds redacted text only, no IP; rows older
--     than 90 days are purged daily. The AI rate limit lives in
--     ai_rate_limits (ADR 0007).
--   * Search normalizes Cyrillic and diacritics before full-text and trigram
--     matching (ADR 0011).
-- Assumes Supabase objects: roles anon, authenticated, service_role; schema
-- auth with auth.users, auth.uid(), auth.jwt(); schema extensions.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- EXTENSIONS AND SCHEMAS
-- -----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA extensions;

-- Helper functions live in a schema PostgREST does not expose, so they cannot
-- be called as RPC endpoints. Why: several are SECURITY DEFINER.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- ENUM TYPES
-- -----------------------------------------------------------------------------

CREATE TYPE content_status AS ENUM (
  'draft',      -- being prepared, not visible to the public
  'published',  -- visible to the public
  'archived'    -- withdrawn, kept in the database, not visible
);

CREATE TYPE audit_action AS ENUM (
  'create',   -- row inserted
  'update',   -- row changed
  'archive',  -- status changed to archived
  'delete'    -- child or link row removed (content entities are never deleted)
);

-- ADR 0008: the UI calls these "organizations".
CREATE TYPE institution_kind AS ENUM ('government', 'bank', 'employer', 'other');

-- ADR 0008: an empty amount no longer means "free".
CREATE TYPE cost_type AS ENUM ('free', 'fixed', 'variable', 'unknown');


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Admin check used by every write policy (ADR 0004). STABLE so the planner
-- evaluates it once per statement when wrapped in (SELECT ...).
CREATE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

COMMENT ON FUNCTION private.is_admin() IS
  'True when the caller''s JWT has app_metadata.role = ''admin''. app_metadata is writable only server-side, so users cannot grant it to themselves.';

-- Search normalization (ADR 0011): Cyrillic -> Latin, đ -> dj, strip
-- diacritics, lowercase. Why a function instead of an unaccent mapping in a
-- text search configuration: the serbian stemmer transliterates Cyrillic but
-- emits diacritics, and a filtering dictionary such as unaccent cannot run
-- after the stemmer. Normalizing the input first makes 'pasoš', 'pasos' and
-- 'пасош' identical before stemming. Declared IMMUTABLE so it can back
-- generated columns and expression indexes (unaccent itself is only STABLE
-- because its rules file could change; we accept that, and regenerate the
-- columns if the rules ever change).
CREATE FUNCTION public.aa_normalize(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT lower(
    extensions.unaccent(
      'extensions.unaccent'::regdictionary,
      replace(replace(
        translate(
          replace(replace(replace(replace(replace(replace(input,
            'љ', 'lj'), 'њ', 'nj'), 'џ', 'dž'),
            'Љ', 'Lj'), 'Њ', 'Nj'), 'Џ', 'Dž'),
          'абвгдђежзијклмнопрстћуфхцчшАБВГДЂЕЖЗИЈКЛМНОПРСТЋУФХЦЧШ',
          'abvgdđežzijklmnoprstćufhcčšABVGDĐEŽZIJKLMNOPRSTĆUFHCČŠ'),
        'đ', 'dj'), 'Đ', 'Dj')
    )
  )
$$;

COMMENT ON FUNCTION public.aa_normalize(text) IS
  'Normalizes text for search: Cyrillic to Latin, đ to dj, no diacritics, lowercase.';

CREATE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- -----------------------------------------------------------------------------
-- CATEGORIES
-- Groups life events for navigation. No status: a category is publicly visible
-- while it contains at least one published life event.
-- -----------------------------------------------------------------------------

CREATE TABLE categories (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(100)  NOT NULL UNIQUE,
  slug        varchar(100)  NOT NULL UNIQUE
                            CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icon        varchar(100),
  sort_order  integer       NOT NULL DEFAULT 0,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  categories            IS 'Life event categories for grouping and navigation.';
COMMENT ON COLUMN categories.slug       IS 'URL identifier, lowercase ASCII with hyphens (e.g. licna-dokumenta).';
COMMENT ON COLUMN categories.icon       IS 'Lucide icon name in kebab-case, rendered by the Osnova Icon component (e.g. id-card).';
COMMENT ON COLUMN categories.sort_order IS 'Display order in navigation.';


-- -----------------------------------------------------------------------------
-- LIFE_EVENTS
-- A life situation in the citizen's words. Ordered container for procedures.
-- -----------------------------------------------------------------------------

CREATE TABLE life_events (
  id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         uuid            NOT NULL REFERENCES categories(id),
  title               varchar(200)    NOT NULL,
  description         text,
  icon                varchar(100),
  slug                varchar(200)    NOT NULL UNIQUE
                                      CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  estimated_duration  text,
  status              content_status  NOT NULL DEFAULT 'draft',
  sort_order          integer         NOT NULL DEFAULT 0,
  created_at          timestamptz     NOT NULL DEFAULT now(),
  updated_at          timestamptz     NOT NULL DEFAULT now(),
  search_vector       tsvector        GENERATED ALWAYS AS (
                        setweight(to_tsvector('serbian'::regconfig, coalesce(public.aa_normalize(title), '')), 'A') ||
                        setweight(to_tsvector('serbian'::regconfig, coalesce(public.aa_normalize(description), '')), 'B')
                      ) STORED
);

COMMENT ON TABLE  life_events                    IS 'Life situations in the citizen''s words (e.g. "Selim se").';
COMMENT ON COLUMN life_events.title              IS 'Title in everyday language, not official terminology.';
COMMENT ON COLUMN life_events.icon               IS 'Lucide icon name in kebab-case, rendered by the Osnova Icon component (e.g. house).';
COMMENT ON COLUMN life_events.estimated_duration IS 'Admin-entered total duration shown on cards (e.g. "~2 nedelje"). Not computed (ADR 0008).';
COMMENT ON COLUMN life_events.status             IS 'Only published rows are public. Publishing requires at least one published procedure (PR-04).';
COMMENT ON COLUMN life_events.sort_order         IS 'Order within the category.';
COMMENT ON COLUMN life_events.search_vector      IS 'Generated. Normalized title (A) and description (B), serbian stemmer.';

CREATE INDEX idx_life_events_status          ON life_events(status);
CREATE INDEX idx_life_events_category_status ON life_events(category_id, status);
CREATE INDEX idx_life_events_search          ON life_events USING gin (search_vector);
CREATE INDEX idx_life_events_title_trgm      ON life_events USING gin (public.aa_normalize(title) extensions.gin_trgm_ops);


-- -----------------------------------------------------------------------------
-- INSTITUTIONS
-- Organization responsible for procedures: a government body, a bank, an
-- employer or other (ADR 0008). Branch offices are not modeled in v1; the
-- procedure links to the official office locator.
-- -----------------------------------------------------------------------------

CREATE TABLE institutions (
  id             uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  name           varchar(200)      NOT NULL UNIQUE,
  slug           varchar(200)      NOT NULL UNIQUE
                                   CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind           institution_kind  NOT NULL DEFAULT 'government',
  description    text,
  address        text,
  website        varchar(500),
  phone          varchar(50),
  email          varchar(200),
  working_hours  text,
  status         content_status    NOT NULL DEFAULT 'draft',
  created_at     timestamptz       NOT NULL DEFAULT now(),
  updated_at     timestamptz       NOT NULL DEFAULT now(),
  search_vector  tsvector          GENERATED ALWAYS AS (
                   setweight(to_tsvector('serbian'::regconfig, coalesce(public.aa_normalize(name), '')), 'A') ||
                   setweight(to_tsvector('serbian'::regconfig, coalesce(public.aa_normalize(description), '')), 'B')
                 ) STORED
);

COMMENT ON TABLE  institutions               IS 'Organizations responsible for procedures (government, bank, employer, other).';
COMMENT ON COLUMN institutions.kind          IS 'Organization type (ADR 0008).';
COMMENT ON COLUMN institutions.address       IS 'Street address of the head office, free text (ADR 0008).';
COMMENT ON COLUMN institutions.working_hours IS 'Working hours, free text.';

CREATE INDEX idx_institutions_status     ON institutions(status);
CREATE INDEX idx_institutions_search     ON institutions USING gin (search_vector);
CREATE INDEX idx_institutions_name_trgm  ON institutions USING gin (public.aa_normalize(name) extensions.gin_trgm_ops);


-- -----------------------------------------------------------------------------
-- PROCEDURES (central entity)
-- -----------------------------------------------------------------------------

CREATE TABLE procedures (
  id                uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  title             varchar(200)    NOT NULL,
  description       text,
  slug              varchar(200)    NOT NULL UNIQUE
                                    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- Ways to complete it; at least one must be true (PR-03)
  can_online        boolean         NOT NULL DEFAULT false,
  can_in_person     boolean         NOT NULL DEFAULT true,
  can_by_mail       boolean         NOT NULL DEFAULT false,

  -- Cost (ADR 0008)
  cost_type         cost_type       NOT NULL DEFAULT 'unknown',
  cost_amount       numeric(10,2),
  cost_description  text,

  -- Timing and links
  processing_time   varchar(200),
  official_link     varchar(500),
  form_link         varchar(500),

  -- Status and verification
  status            content_status  NOT NULL DEFAULT 'draft',
  last_verified_at  timestamptz,

  -- Bookkeeping (set by trigger from auth.uid())
  created_at        timestamptz     NOT NULL DEFAULT now(),
  updated_at        timestamptz     NOT NULL DEFAULT now(),
  created_by        uuid            REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by        uuid            REFERENCES auth.users(id) ON DELETE SET NULL,

  search_vector     tsvector        GENERATED ALWAYS AS (
                      setweight(to_tsvector('serbian'::regconfig, coalesce(public.aa_normalize(title), '')), 'A') ||
                      setweight(to_tsvector('serbian'::regconfig, coalesce(public.aa_normalize(description), '')), 'B')
                    ) STORED,

  CONSTRAINT chk_procedure_has_method
    CHECK (can_online OR can_in_person OR can_by_mail),
  -- An amount exists exactly when the cost is fixed.
  CONSTRAINT chk_procedure_cost_amount
    CHECK ((cost_type = 'fixed') = (cost_amount IS NOT NULL)),
  CONSTRAINT chk_procedure_cost_non_negative
    CHECK (cost_amount IS NULL OR cost_amount >= 0)
);

COMMENT ON TABLE  procedures                  IS 'Central entity: one concrete administrative procedure. Public only when published AND linked to a published life event (PR-05).';
COMMENT ON COLUMN procedures.can_online       IS 'Can be completed online.';
COMMENT ON COLUMN procedures.can_in_person    IS 'Can be completed in person.';
COMMENT ON COLUMN procedures.can_by_mail      IS 'Can be completed by mail.';
COMMENT ON COLUMN procedures.cost_type        IS 'free | fixed | variable | unknown. The UI shows "Besplatno" only for free.';
COMMENT ON COLUMN procedures.cost_amount      IS 'Amount in RSD. Required for fixed, NULL otherwise. Serialized as a decimal string in the API.';
COMMENT ON COLUMN procedures.last_verified_at IS 'Last admin verification. NULL or older than 6 months shows the stale warning (PR-07, ADR 0011).';
COMMENT ON COLUMN procedures.created_by       IS 'Admin who created the procedure (set by trigger).';
COMMENT ON COLUMN procedures.updated_by       IS 'Admin who last changed the procedure (set by trigger).';

CREATE INDEX idx_procedures_status        ON procedures(status);
CREATE INDEX idx_procedures_last_verified ON procedures(last_verified_at NULLS FIRST);
CREATE INDEX idx_procedures_search        ON procedures USING gin (search_vector);
CREATE INDEX idx_procedures_title_trgm    ON procedures USING gin (public.aa_normalize(title) extensions.gin_trgm_ops);


-- -----------------------------------------------------------------------------
-- STEPS
-- Ordered steps of a procedure. A published procedure needs at least one (PR-01).
-- -----------------------------------------------------------------------------

CREATE TABLE steps (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id  uuid          NOT NULL REFERENCES procedures(id),
  sort_order    integer       NOT NULL DEFAULT 0,
  title         varchar(300)  NOT NULL,
  description   text          NOT NULL,
  link_url      varchar(500),
  link_label    varchar(200),
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),

  -- Deferred so a reorder can swap positions inside one transaction.
  CONSTRAINT uq_steps_order UNIQUE (procedure_id, sort_order) DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE  steps            IS 'Ordered steps of a procedure.';
COMMENT ON COLUMN steps.sort_order IS 'Position within the procedure; unique per procedure.';
COMMENT ON COLUMN steps.link_url   IS 'Optional link (e.g. the online booking page).';


-- -----------------------------------------------------------------------------
-- DOCUMENTS
-- Documents the citizen prepares. Owned by one procedure (ADR 0005).
-- -----------------------------------------------------------------------------

CREATE TABLE documents (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id  uuid          NOT NULL REFERENCES procedures(id),
  name          varchar(300)  NOT NULL,
  description   text,
  is_required   boolean       NOT NULL DEFAULT true,
  note          text,
  sort_order    integer       NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT uq_documents_order UNIQUE (procedure_id, sort_order) DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE  documents             IS 'Documents needed for a procedure. Edited inside the procedure form (ADR 0005).';
COMMENT ON COLUMN documents.is_required IS 'true = required, false = optional.';
COMMENT ON COLUMN documents.note        IS 'Extra note (e.g. original only, not older than 6 months).';


-- =============================================================================
-- LINK TABLES (N:M)
-- =============================================================================

-- Life event <-> procedure, with order. The same procedure is referenced from
-- several events, never copied (PR-06).
CREATE TABLE life_event_procedures (
  life_event_id  uuid     NOT NULL REFERENCES life_events(id),
  procedure_id   uuid     NOT NULL REFERENCES procedures(id),
  sort_order     integer  NOT NULL DEFAULT 0,

  PRIMARY KEY (life_event_id, procedure_id),
  CONSTRAINT uq_lep_order UNIQUE (life_event_id, sort_order) DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE  life_event_procedures            IS 'N:M link between life events and procedures (PR-06, PR-08).';
COMMENT ON COLUMN life_event_procedures.sort_order IS 'Position of the procedure inside the event; unique per event.';

CREATE INDEX idx_lep_procedure ON life_event_procedures(procedure_id);


-- Procedure <-> institution.
CREATE TABLE procedure_institutions (
  procedure_id    uuid  NOT NULL REFERENCES procedures(id),
  institution_id  uuid  NOT NULL REFERENCES institutions(id),
  note            text,

  PRIMARY KEY (procedure_id, institution_id)
);

COMMENT ON TABLE  procedure_institutions      IS 'N:M link between procedures and institutions. A published procedure needs at least one (PR-02).';
COMMENT ON COLUMN procedure_institutions.note IS 'Optional note (e.g. online via the MUP portal, in person at the police station).';

CREATE INDEX idx_pi_institution ON procedure_institutions(institution_id);


-- Dependencies between procedures inside one life event (PR-09, PR-10).
-- Both sides must belong to the same event: composite FKs to
-- life_event_procedures. Removing a procedure from an event removes its
-- dependencies in that event (cascade, audited).
CREATE TABLE procedure_dependencies (
  life_event_id  uuid  NOT NULL,
  procedure_id   uuid  NOT NULL,
  depends_on_id  uuid  NOT NULL,

  PRIMARY KEY (life_event_id, procedure_id, depends_on_id),

  CONSTRAINT fk_pd_procedure_in_event
    FOREIGN KEY (life_event_id, procedure_id)
    REFERENCES life_event_procedures(life_event_id, procedure_id) ON DELETE CASCADE,
  CONSTRAINT fk_pd_depends_on_in_event
    FOREIGN KEY (life_event_id, depends_on_id)
    REFERENCES life_event_procedures(life_event_id, procedure_id) ON DELETE CASCADE,
  CONSTRAINT chk_no_self_dependency
    CHECK (procedure_id <> depends_on_id)
);

COMMENT ON TABLE  procedure_dependencies               IS 'Dependencies inside one life event. Cycles are rejected by trigger.';
COMMENT ON COLUMN procedure_dependencies.procedure_id  IS 'The dependent procedure: should start after depends_on is done (warning only, ES-04).';
COMMENT ON COLUMN procedure_dependencies.depends_on_id IS 'The procedure that should be finished first.';

CREATE INDEX idx_pd_event_depends_on ON procedure_dependencies(life_event_id, depends_on_id);


-- -----------------------------------------------------------------------------
-- SYNONYMS
-- Jargon mapped to a standard term (ES-07). Search expands a query that hits
-- a synonym with the full-text query of its maps_to text, so maps_to should
-- use the words of the target's title (see 01-domain-model.md).
-- Synonyms carry no status: they are search vocabulary, not content.
-- -----------------------------------------------------------------------------

CREATE TABLE synonyms (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  term           varchar(200)  NOT NULL,
  maps_to        varchar(200)  NOT NULL,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  search_vector  tsvector      GENERATED ALWAYS AS (
                   to_tsvector('serbian'::regconfig, coalesce(public.aa_normalize(term), ''))
                 ) STORED
);

COMMENT ON TABLE  synonyms         IS 'Informal terms (e.g. "karton", "papiri za auto") mapped to a standard term.';
COMMENT ON COLUMN synonyms.term    IS 'What users type. Unique after normalization.';
COMMENT ON COLUMN synonyms.maps_to IS 'Standard term searched instead (e.g. "izvod iz maticne knjige rodjenih"). Should reuse words from the target title.';

-- "Karton", "karton" and "картон" are the same synonym.
CREATE UNIQUE INDEX uq_synonyms_term_normalized ON synonyms (public.aa_normalize(term));
CREATE INDEX idx_synonyms_search    ON synonyms USING gin (search_vector);
CREATE INDEX idx_synonyms_term_trgm ON synonyms USING gin (public.aa_normalize(term) extensions.gin_trgm_ops);


-- -----------------------------------------------------------------------------
-- AUDIT_LOG
-- Append-only history of every content change, written only by triggers.
-- -----------------------------------------------------------------------------

CREATE TABLE audit_log (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  varchar(100)  NOT NULL,
  entity_id    uuid          NOT NULL,
  action       audit_action  NOT NULL,
  changed_by   uuid,
  changed_at   timestamptz   NOT NULL DEFAULT now(),
  diff         jsonb
);

COMMENT ON TABLE  audit_log             IS 'Append-only log of content changes, written by triggers. No UPDATE, DELETE or TRUNCATE for any role.';
COMMENT ON COLUMN audit_log.entity_type IS 'Table name (e.g. procedures, life_event_procedures).';
COMMENT ON COLUMN audit_log.entity_id   IS 'Row id; for link tables the owning entity (event for life_event_procedures and procedure_dependencies, procedure for procedure_institutions).';
COMMENT ON COLUMN audit_log.changed_by  IS 'auth.uid() of the admin. NULL only for changes run by the database owner (migrations, seeds). No FK, so history survives a deleted account.';
COMMENT ON COLUMN audit_log.diff        IS 'Changed fields: {"field": {"old": ..., "new": ...}}. Insert has old = null, delete has new = null.';

CREATE INDEX idx_audit_log_entity  ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_changed ON audit_log(changed_at);


-- -----------------------------------------------------------------------------
-- AI_QUERIES
-- Questions sent to the AI assistant, after redaction (ADR 0007). Inserted by
-- the AI route with the service role; read by admins (UF-10); purged after
-- 90 days.
-- -----------------------------------------------------------------------------

CREATE TABLE ai_queries (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text     text         NOT NULL,
  was_answered   boolean      NOT NULL DEFAULT false,
  matched_event_id  uuid      REFERENCES life_events(id) ON DELETE SET NULL,
  created_at     timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT chk_ai_query_text_length
    CHECK (char_length(query_text) BETWEEN 1 AND 2000),
  -- Backstop only; redaction happens in the app before the API call. A run of
  -- 13 digits is almost always a JMBG.
  CONSTRAINT chk_ai_query_no_jmbg
    CHECK (query_text !~ '[0-9]{13}')
);

COMMENT ON TABLE  ai_queries               IS 'Redacted AI questions. No raw personal data and no IP (rate limiting lives in ai_rate_limits). Retained 90 days.';
COMMENT ON COLUMN ai_queries.query_text    IS 'Question text AFTER best-effort redaction (JMBG, phone, email, document numbers masked).';
COMMENT ON COLUMN ai_queries.was_answered  IS 'From the model''s structured output, not text parsing (ADR 0006).';
COMMENT ON COLUMN ai_queries.matched_event_id IS 'Life event the question was matched to, if any.';

CREATE INDEX idx_ai_queries_answered ON ai_queries(was_answered, created_at);
CREATE INDEX idx_ai_queries_created  ON ai_queries(created_at);
CREATE INDEX idx_ai_queries_event    ON ai_queries(matched_event_id);


-- -----------------------------------------------------------------------------
-- AI_RATE_LIMITS
-- Fixed hourly window per client, keyed by a salted IP hash (ADR 0007).
-- Why a table: in-memory counters on serverless instances are per instance
-- and reset on cold start, so they do not limit anything.
-- -----------------------------------------------------------------------------

CREATE TABLE ai_rate_limits (
  ip_hash       text         NOT NULL,
  window_start  timestamptz  NOT NULL,
  count         integer      NOT NULL DEFAULT 0 CHECK (count >= 0),

  PRIMARY KEY (ip_hash, window_start),
  -- Hex SHA-256 of (rotating salt + IP). Rejects anything that looks like a raw IP.
  CONSTRAINT chk_rate_limit_ip_hash CHECK (ip_hash ~ '^[0-9a-f]{64}$')
);

COMMENT ON TABLE  ai_rate_limits              IS 'AI chat requests per client per hour. Service role only.';
COMMENT ON COLUMN ai_rate_limits.ip_hash      IS 'Salted SHA-256 of the client IP, lowercase hex. Never the raw IP.';
COMMENT ON COLUMN ai_rate_limits.window_start IS 'Start of the hourly window (date_trunc(''hour'', now())).';

CREATE INDEX idx_ai_rate_limits_window ON ai_rate_limits(window_start);


-- =============================================================================
-- INTEGRITY TRIGGERS
-- =============================================================================

-- updated_at
CREATE TRIGGER trg_categories_updated_at   BEFORE UPDATE ON categories   FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER trg_life_events_updated_at  BEFORE UPDATE ON life_events  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER trg_institutions_updated_at BEFORE UPDATE ON institutions FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER trg_procedures_updated_at   BEFORE UPDATE ON procedures   FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER trg_steps_updated_at        BEFORE UPDATE ON steps        FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER trg_documents_updated_at    BEFORE UPDATE ON documents    FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER trg_synonyms_updated_at     BEFORE UPDATE ON synonyms     FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();


-- procedures.created_by / updated_by from the caller's JWT
CREATE FUNCTION private.set_procedure_actor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(auth.uid(), NEW.created_by);
  ELSE
    NEW.created_by := OLD.created_by;
  END IF;
  NEW.updated_by := coalesce(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_procedures_actor
  BEFORE INSERT OR UPDATE ON procedures
  FOR EACH ROW EXECUTE FUNCTION private.set_procedure_actor();


-- Cycle prevention (PR-10, ES-05). Walks the chain from the new depends_on
-- and rejects the row if it reaches procedure_id. The advisory lock per life
-- event serializes concurrent inserts, so two transactions cannot each add
-- half of a cycle. Assumes READ COMMITTED (the Supabase default): after
-- waiting for the lock, the next statement sees the other transaction's rows.
CREATE FUNCTION private.check_dependency_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('procedure_dependencies:' || NEW.life_event_id::text, 0));

  IF EXISTS (
    WITH RECURSIVE chain(id) AS (
      SELECT NEW.depends_on_id
      UNION
      SELECT pd.depends_on_id
        FROM public.procedure_dependencies pd
        JOIN chain c ON pd.procedure_id = c.id
       WHERE pd.life_event_id = NEW.life_event_id
         -- on UPDATE, ignore the row being replaced
         AND NOT (TG_OP = 'UPDATE'
                  AND pd.life_event_id = OLD.life_event_id
                  AND pd.procedure_id  = OLD.procedure_id
                  AND pd.depends_on_id = OLD.depends_on_id)
    )
    SELECT 1 FROM chain WHERE id = NEW.procedure_id
  ) THEN
    RAISE EXCEPTION 'circular dependency: procedure % already (transitively) depends on %',
                    NEW.depends_on_id, NEW.procedure_id
      USING ERRCODE = '23514',
            HINT    = 'Remove one of the dependencies that form the cycle.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pd_no_cycle
  BEFORE INSERT OR UPDATE ON procedure_dependencies
  FOR EACH ROW EXECUTE FUNCTION private.check_dependency_cycle();


-- Publish rules. Checked at COMMIT (deferred constraint triggers), so an
-- admin route can create an event, link procedures and publish in one
-- transaction, or replace an event's procedure list in one transaction.
--   PR-04: a published life event has at least one published procedure.
--   PR-01/PR-02: a published procedure has at least one step and one institution.
CREATE FUNCTION private.assert_life_event_publishable(p_event uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.life_events e WHERE e.id = p_event AND e.status = 'published')
     AND NOT EXISTS (
       SELECT 1
         FROM public.life_event_procedures lep
         JOIN public.procedures p ON p.id = lep.procedure_id
        WHERE lep.life_event_id = p_event
          AND p.status = 'published')
  THEN
    RAISE EXCEPTION 'life event % is published but has no published procedure', p_event
      USING ERRCODE = '23514',
            HINT    = 'Link at least one published procedure, or set the event back to draft (PR-04).';
  END IF;
END;
$$;

CREATE FUNCTION private.assert_procedure_publishable(p_procedure uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.procedures p WHERE p.id = p_procedure AND p.status = 'published') THEN
    IF NOT EXISTS (SELECT 1 FROM public.steps s WHERE s.procedure_id = p_procedure) THEN
      RAISE EXCEPTION 'procedure % is published but has no steps', p_procedure
        USING ERRCODE = '23514', HINT = 'Add at least one step (PR-01).';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.procedure_institutions pi WHERE pi.procedure_id = p_procedure) THEN
      RAISE EXCEPTION 'procedure % is published but has no institution', p_procedure
        USING ERRCODE = '23514', HINT = 'Link at least one institution (PR-02).';
    END IF;
  END IF;
END;
$$;

CREATE FUNCTION private.check_publish_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event uuid;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'life_events' THEN
      PERFORM private.assert_life_event_publishable(NEW.id);

    WHEN 'procedures' THEN
      PERFORM private.assert_procedure_publishable(NEW.id);
      FOR v_event IN
        SELECT lep.life_event_id FROM public.life_event_procedures lep WHERE lep.procedure_id = NEW.id
      LOOP
        PERFORM private.assert_life_event_publishable(v_event);
      END LOOP;

    WHEN 'life_event_procedures' THEN
      PERFORM private.assert_life_event_publishable(OLD.life_event_id);

    WHEN 'steps', 'procedure_institutions' THEN
      PERFORM private.assert_procedure_publishable(OLD.procedure_id);
  END CASE;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_life_events_publish
  AFTER INSERT OR UPDATE ON life_events
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION private.check_publish_rules();

CREATE CONSTRAINT TRIGGER trg_procedures_publish
  AFTER INSERT OR UPDATE ON procedures
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION private.check_publish_rules();

CREATE CONSTRAINT TRIGGER trg_lep_publish
  AFTER UPDATE OR DELETE ON life_event_procedures
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION private.check_publish_rules();

CREATE CONSTRAINT TRIGGER trg_steps_publish
  AFTER UPDATE OR DELETE ON steps
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION private.check_publish_rules();

CREATE CONSTRAINT TRIGGER trg_pi_publish
  AFTER UPDATE OR DELETE ON procedure_institutions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION private.check_publish_rules();


-- =============================================================================
-- WRITE GUARD AND AUDIT
-- =============================================================================

-- Rejects content writes from API roles without an admin JWT. RLS already
-- blocks anon and non-admin users; this also blocks the service role, which
-- bypasses RLS (ADR 0004: the service role never writes content). The
-- database owner (migrations, seeds) is not an API role and passes.
CREATE FUNCTION private.guard_content_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated', 'service_role') AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'content changes require an admin session'
      USING ERRCODE = '42501';
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

-- Writes one audit_log row per changed row. SECURITY DEFINER because no API
-- role may insert into audit_log directly. TG_ARGV[0] names the column that
-- identifies the entity (default 'id').
CREATE FUNCTION private.audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id_col text := coalesce(TG_ARGV[0], 'id');
  v_old    jsonb;
  v_new    jsonb;
  v_diff   jsonb;
  v_action public.audit_action;
  v_id     uuid;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old := to_jsonb(OLD) - 'search_vector' - 'updated_at';
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new := to_jsonb(NEW) - 'search_vector' - 'updated_at';
  END IF;

  SELECT jsonb_object_agg(k, jsonb_build_object('old', v_old -> k, 'new', v_new -> k))
    INTO v_diff
    FROM (SELECT jsonb_object_keys(coalesce(v_new, v_old)) AS k) keys
   WHERE (v_old -> k) IS DISTINCT FROM (v_new -> k);

  IF v_diff IS NULL THEN
    RETURN NULL;  -- no-op update, nothing to log
  END IF;

  v_action := CASE
    WHEN TG_OP = 'INSERT' THEN 'create'
    WHEN TG_OP = 'DELETE' THEN 'delete'
    WHEN v_new ->> 'status' = 'archived' AND v_old ->> 'status' IS DISTINCT FROM 'archived' THEN 'archive'
    ELSE 'update'
  END::public.audit_action;

  v_id := (coalesce(v_new, v_old) ->> v_id_col)::uuid;

  INSERT INTO public.audit_log (entity_type, entity_id, action, changed_by, diff)
  VALUES (TG_TABLE_NAME, v_id, v_action, auth.uid(), v_diff);

  RETURN NULL;
END;
$$;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('categories',             'id'),
      ('life_events',            'id'),
      ('institutions',           'id'),
      ('procedures',             'id'),
      ('steps',                  'id'),
      ('documents',              'id'),
      ('synonyms',               'id'),
      ('life_event_procedures',  'life_event_id'),
      ('procedure_institutions', 'procedure_id'),
      ('procedure_dependencies', 'life_event_id')
    ) AS v(tbl, id_col)
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION private.guard_content_write()', t.tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION private.audit_row(%2$L)', t.tbl, t.id_col);
  END LOOP;
END;
$$;


-- audit_log is append-only for everyone, including the table owner.
CREATE FUNCTION private.reject_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only' USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION private.reject_audit_change();

CREATE TRIGGER trg_audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION private.reject_audit_change();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- Visibility helpers are SECURITY DEFINER so policies can look at related
-- tables without recursing into those tables' own policies.

CREATE FUNCTION private.procedure_is_public(p_procedure uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- PR-05: published AND linked to at least one published life event.
  SELECT EXISTS (
    SELECT 1
      FROM public.procedures p
      JOIN public.life_event_procedures lep ON lep.procedure_id = p.id
      JOIN public.life_events e            ON e.id = lep.life_event_id
     WHERE p.id = p_procedure
       AND p.status = 'published'
       AND e.status = 'published')
$$;

CREATE FUNCTION private.life_event_is_public(p_event uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.life_events e WHERE e.id = p_event AND e.status = 'published')
$$;

CREATE FUNCTION private.institution_is_public(p_institution uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = p_institution AND i.status = 'published')
$$;

REVOKE ALL ON FUNCTION private.is_admin()                        FROM PUBLIC;
REVOKE ALL ON FUNCTION private.procedure_is_public(uuid)         FROM PUBLIC;
REVOKE ALL ON FUNCTION private.life_event_is_public(uuid)        FROM PUBLIC;
REVOKE ALL ON FUNCTION private.institution_is_public(uuid)       FROM PUBLIC;
REVOKE ALL ON FUNCTION private.assert_life_event_publishable(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.assert_procedure_publishable(uuid)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin()                  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.procedure_is_public(uuid)   TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.life_event_is_public(uuid)  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.institution_is_public(uuid) TO anon, authenticated, service_role;

ALTER TABLE categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures             ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE synonyms               ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_event_procedures  ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_queries             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_rate_limits         ENABLE ROW LEVEL SECURITY;  -- no policies: service role only


-- ---- Public reads (anon and authenticated) ----------------------------------

CREATE POLICY categories_public_read ON categories
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM life_events e
                  WHERE e.category_id = categories.id AND e.status = 'published'));

CREATE POLICY life_events_public_read ON life_events
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY institutions_public_read ON institutions
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY procedures_public_read ON procedures
  FOR SELECT TO anon, authenticated
  USING (private.procedure_is_public(id));

CREATE POLICY steps_public_read ON steps
  FOR SELECT TO anon, authenticated
  USING (private.procedure_is_public(procedure_id));

CREATE POLICY documents_public_read ON documents
  FOR SELECT TO anon, authenticated
  USING (private.procedure_is_public(procedure_id));

CREATE POLICY lep_public_read ON life_event_procedures
  FOR SELECT TO anon, authenticated
  USING (private.life_event_is_public(life_event_id)
         AND private.procedure_is_public(procedure_id));

CREATE POLICY pi_public_read ON procedure_institutions
  FOR SELECT TO anon, authenticated
  USING (private.procedure_is_public(procedure_id)
         AND private.institution_is_public(institution_id));

-- Dependencies on non-public procedures are hidden, so the checklist never
-- blocks on something the citizen cannot see.
CREATE POLICY pd_public_read ON procedure_dependencies
  FOR SELECT TO anon, authenticated
  USING (private.life_event_is_public(life_event_id)
         AND private.procedure_is_public(procedure_id)
         AND private.procedure_is_public(depends_on_id));

-- Synonyms have no draft state; they are search vocabulary, readable by all.
CREATE POLICY synonyms_public_read ON synonyms
  FOR SELECT TO anon, authenticated
  USING (true);


-- ---- Admin access (authenticated with app_metadata.role = 'admin') ----------
-- Content entities: select, insert, update; no delete (archive instead).
-- Categories have no status and are not deleted either (API has no delete).

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories', 'life_events', 'institutions', 'procedures'] LOOP
    EXECUTE format('CREATE POLICY %1$s_admin_select ON public.%1$I FOR SELECT TO authenticated USING ((SELECT private.is_admin()))', t);
    EXECUTE format('CREATE POLICY %1$s_admin_insert ON public.%1$I FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()))', t);
    EXECUTE format('CREATE POLICY %1$s_admin_update ON public.%1$I FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()))', t);
  END LOOP;

  -- Child rows, link rows and synonyms: full CRUD, deletes are audited.
  FOREACH t IN ARRAY ARRAY['steps', 'documents', 'synonyms',
                           'life_event_procedures', 'procedure_institutions',
                           'procedure_dependencies'] LOOP
    EXECUTE format('CREATE POLICY %1$s_admin_all ON public.%1$I FOR ALL TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()))', t);
  END LOOP;
END;
$$;

-- audit_log: admins read; nobody writes directly (triggers only).
CREATE POLICY audit_log_admin_read ON audit_log
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

-- ai_queries: admins read (UF-10). No anon access at all. Inserts come from
-- the AI route with the service role, which bypasses RLS; grants below limit
-- it to INSERT and SELECT.
CREATE POLICY ai_queries_admin_read ON ai_queries
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));


-- ---- Table privileges -------------------------------------------------------
-- Supabase grants ALL on new public tables to anon, authenticated and
-- service_role by default. TRUNCATE ignores RLS, so it must go too.

REVOKE ALL ON categories, life_events, institutions, procedures, steps, documents,
              synonyms, life_event_procedures, procedure_institutions,
              procedure_dependencies, audit_log, ai_queries, ai_rate_limits
  FROM anon, authenticated, service_role;

GRANT SELECT ON categories, life_events, institutions, procedures, steps, documents,
                synonyms, life_event_procedures, procedure_institutions,
                procedure_dependencies
  TO anon, authenticated, service_role;

GRANT INSERT, UPDATE ON categories, life_events, institutions, procedures, steps,
                        documents, synonyms, life_event_procedures,
                        procedure_institutions, procedure_dependencies
  TO authenticated;

GRANT DELETE ON steps, documents, synonyms, life_event_procedures,
                procedure_institutions, procedure_dependencies
  TO authenticated;

GRANT SELECT ON audit_log  TO authenticated;
GRANT SELECT ON ai_queries TO authenticated;
GRANT SELECT, INSERT ON ai_queries TO service_role;
GRANT SELECT, INSERT, UPDATE ON ai_rate_limits TO service_role;


-- =============================================================================
-- SEARCH (ADR 0011)
-- =============================================================================
-- Combines three signals over normalized text:
--   1. full-text match with the serbian stemmer (weights: title A, description B)
--   2. trigram word similarity on titles/names (typos, partial words)
--   3. synonyms: a query that hits a synonym also searches its maps_to (ES-07)
-- SECURITY INVOKER: results pass through the caller's RLS, so anon never sees
-- drafts or unlinked procedures.

CREATE FUNCTION public.search_content(q text, max_results integer DEFAULT 20)
RETURNS TABLE (kind text, id uuid, slug text, title text, rank real)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH nq AS (
    SELECT public.aa_normalize(q) AS n,
           websearch_to_tsquery('serbian'::regconfig, public.aa_normalize(q)) AS tsq
  ),
  -- Synonyms hit by the query contribute the full-text query of maps_to.
  syn AS (
    SELECT plainto_tsquery('serbian'::regconfig, public.aa_normalize(s.maps_to)) AS tsq
      FROM public.synonyms s, nq
     WHERE s.search_vector @@ nq.tsq
        OR public.aa_normalize(s.term) OPERATOR(extensions.%>) nq.n
  ),
  hits AS (
    SELECT 'life_event'::text AS kind, e.id, e.slug::text, e.title::text,
           ts_rank(e.search_vector, nq.tsq) * 2
           + extensions.word_similarity(nq.n, public.aa_normalize(e.title)) AS r
      FROM public.life_events e, nq
     WHERE e.search_vector @@ nq.tsq
        OR public.aa_normalize(e.title) OPERATOR(extensions.%>) nq.n
    UNION ALL
    SELECT 'procedure', p.id, p.slug::text, p.title::text,
           ts_rank(p.search_vector, nq.tsq) * 2
           + extensions.word_similarity(nq.n, public.aa_normalize(p.title))
      FROM public.procedures p, nq
     WHERE p.search_vector @@ nq.tsq
        OR public.aa_normalize(p.title) OPERATOR(extensions.%>) nq.n
    UNION ALL
    SELECT 'institution', i.id, i.slug::text, i.name::text,
           ts_rank(i.search_vector, nq.tsq) * 2
           + extensions.word_similarity(nq.n, public.aa_normalize(i.name))
      FROM public.institutions i, nq
     WHERE i.search_vector @@ nq.tsq
        OR public.aa_normalize(i.name) OPERATOR(extensions.%>) nq.n
    UNION ALL
    SELECT 'life_event', e.id, e.slug::text, e.title::text, 1.5::real
      FROM public.life_events e, syn
     WHERE e.search_vector @@ syn.tsq
    UNION ALL
    SELECT 'procedure', p.id, p.slug::text, p.title::text, 1.5::real
      FROM public.procedures p, syn
     WHERE p.search_vector @@ syn.tsq
  )
  SELECT h.kind, h.id, h.slug, h.title, max(h.r)::real AS rank
    FROM hits h
   GROUP BY h.kind, h.id, h.slug, h.title
   ORDER BY rank DESC, h.title
   LIMIT least(greatest(max_results, 1), 50)
$$;

COMMENT ON FUNCTION public.search_content(text, integer) IS
  'Public search over life events, procedures and institutions. Accepts Latin, Cyrillic and text without diacritics. Runs under the caller''s RLS.';

GRANT EXECUTE ON FUNCTION public.search_content(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aa_normalize(text) TO anon, authenticated, service_role;


-- =============================================================================
-- AI RATE LIMIT AND RETENTION (ADR 0007)
-- =============================================================================

-- Counts one request for p_ip_hash in the current hourly window and returns
-- true while the caller is within p_limit, false once over it. One atomic
-- upsert, so concurrent requests cannot both slip under the limit.
CREATE FUNCTION public.ai_rate_limit_hit(p_ip_hash text, p_limit integer)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  INSERT INTO public.ai_rate_limits AS r (ip_hash, window_start, count)
  VALUES (p_ip_hash, date_trunc('hour', now()), 1)
  ON CONFLICT (ip_hash, window_start)
  DO UPDATE SET count = r.count + 1
  RETURNING r.count <= p_limit
$$;

COMMENT ON FUNCTION public.ai_rate_limit_hit(text, integer) IS
  'Registers one AI request in the current hour; true = allowed, false = over the limit. Service role only.';

REVOKE ALL ON FUNCTION public.ai_rate_limit_hit(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_rate_limit_hit(text, integer) TO service_role;

CREATE FUNCTION private.purge_expired_ai_data()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_queries integer;
BEGIN
  DELETE FROM public.ai_queries WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_queries = ROW_COUNT;
  -- Windows before the current hour are no longer needed.
  DELETE FROM public.ai_rate_limits WHERE window_start < date_trunc('hour', now());
  RETURN v_queries;
END;
$$;

COMMENT ON FUNCTION private.purge_expired_ai_data() IS
  'Deletes ai_queries older than 90 days and expired ai_rate_limits windows. Returns deleted ai_queries. Scheduled daily by pg_cron (job purge-expired-ai-data).';

REVOKE ALL ON FUNCTION private.purge_expired_ai_data() FROM PUBLIC;

-- Schedule with pg_cron when available (Supabase: enable "pg_cron" under
-- Database > Extensions). Without it, nothing is scheduled and a NOTICE says
-- so; the job must then be created before going to production.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.schedule('purge-expired-ai-data', '17 3 * * *',
                          'SELECT private.purge_expired_ai_data()');
  ELSE
    RAISE NOTICE 'pg_cron is not available: schedule private.purge_expired_ai_data() daily before production.';
  END IF;
END;
$$;


-- =============================================================================
-- Changes from v1.0 (details and reasons: 01-domain-model.md, "Changes from v1.0")
-- =============================================================================
-- * RLS on every table, incl. ai_queries, audit_log, ai_rate_limits (were open to anon).
-- * Public reads check parent visibility; no USING (true) on content (draft steps leaked).
-- * Procedures public only when linked to a published life event (PR-05).
-- * Admin write policies via private.is_admin() (app_metadata.role = 'admin').
-- * Audit triggers with auth.uid(); audit_log append-only for every role.
-- * TRUNCATE and unneeded grants revoked from API roles; service role cannot write content.
-- * Cycle trigger with advisory lock; composite FKs keep dependencies in one event.
-- * Deferred publish rules: PR-04 (event needs a published procedure), PR-01/02.
-- * No ON DELETE CASCADE from content; audit_action gains 'delete'.
-- * updated_at and created_by/updated_by triggers.
-- * ADR 0008 fields: institutions.address, institutions.kind, procedures.cost_type,
--   life_events.estimated_duration.
-- * Unique sort_order per parent, slug format checks, normalized unique synonyms.
-- * Search: aa_normalize + serbian stemmer + pg_trgm + search_content() (ADR 0011).
-- * ai_queries: redacted text, matched_event_id, JMBG backstop, 90-day purge (ADR 0007).
-- * ai_rate_limits + ai_rate_limit_hit() replace the in-memory rate limit.
-- * Comments in English; can_in_person comment fixed ("can", not "must").
