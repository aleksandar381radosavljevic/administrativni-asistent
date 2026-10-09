-- =============================================================================
-- Admin write functions (ADR 0004) and AI query statistics.
-- Tests: supabase/tests/schema_smoke.sql, section 8.
-- =============================================================================
-- Why functions: PostgREST runs every request in its own transaction. Saving a
-- procedure with its full lists of steps, documents and institution links, or
-- replacing a life event's procedure list, takes several statements that must
-- commit together: the deferred publish rules (PR-01, PR-02, PR-04) and the
-- deferred unique sort_order constraints are checked at COMMIT, so a published
-- procedure cannot lose its old steps in one request and get new ones in the
-- next. One RPC call is one transaction.
--
-- All functions are SECURITY INVOKER: they run as the calling admin, so RLS
-- write policies, the write guard and the audit triggers (auth.uid()) apply
-- exactly as for direct table writes. Only `authenticated` may execute them;
-- RLS and the guard reject a caller without the admin claim.
-- =============================================================================


-- Saves a procedure with its full lists (03 ProcedureWrite). Without p_id it creates
-- it; otherwise the procedure is updated and P0002 is raised when it does not
-- exist (or the caller cannot see it). Returns the procedure id.
--
-- Steps and documents have no id in the contract, so they are matched by
-- sort_order: the row at the same position is updated, positions missing from
-- the list are deleted, new positions are inserted. Unchanged rows produce no
-- audit entry, so saving a form without edits leaves the audit log quiet.
-- Institution links are matched by institution id; institution_notes (keyed by
-- institution id) sets the per-link note.
CREATE FUNCTION public.admin_save_procedure(p_procedure jsonb, p_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_steps jsonb := coalesce(p_procedure -> 'steps', '[]'::jsonb);
  v_documents jsonb := coalesce(p_procedure -> 'documents', '[]'::jsonb);
  v_institutions jsonb := coalesce(p_procedure -> 'institution_ids', '[]'::jsonb);
  v_notes jsonb := coalesce(p_procedure -> 'institution_notes', '{}'::jsonb);
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO public.procedures (
      title, description, slug, can_online, can_in_person, can_by_mail,
      cost_type, cost_amount, cost_description, processing_time,
      official_link, form_link, status, last_verified_at)
    SELECT r.title, r.description, r.slug, r.can_online, r.can_in_person, r.can_by_mail,
           r.cost_type, r.cost_amount, r.cost_description, r.processing_time,
           r.official_link, r.form_link, r.status, r.last_verified_at
      FROM jsonb_populate_record(NULL::public.procedures, p_procedure) AS r
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.procedures AS p
       SET title = r.title, description = r.description, slug = r.slug,
           can_online = r.can_online, can_in_person = r.can_in_person,
           can_by_mail = r.can_by_mail, cost_type = r.cost_type,
           cost_amount = r.cost_amount, cost_description = r.cost_description,
           processing_time = r.processing_time, official_link = r.official_link,
           form_link = r.form_link, status = r.status,
           last_verified_at = r.last_verified_at
      FROM jsonb_populate_record(NULL::public.procedures, p_procedure) AS r
     WHERE p.id = p_id
    RETURNING p.id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'procedure % not found', p_id USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- Steps, matched by sort_order.
  DELETE FROM public.steps AS s
   WHERE s.procedure_id = v_id
     AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset(v_steps) AS n(sort_order integer)
                      WHERE n.sort_order = s.sort_order);
  UPDATE public.steps AS s
     SET title = n.title, description = n.description,
         link_url = n.link_url, link_label = n.link_label
    FROM jsonb_to_recordset(v_steps)
         AS n(sort_order integer, title text, description text, link_url text, link_label text)
   WHERE s.procedure_id = v_id AND s.sort_order = n.sort_order
     AND (s.title, s.description, s.link_url, s.link_label)
         IS DISTINCT FROM (n.title, n.description, n.link_url, n.link_label);
  INSERT INTO public.steps (procedure_id, sort_order, title, description, link_url, link_label)
  SELECT v_id, n.sort_order, n.title, n.description, n.link_url, n.link_label
    FROM jsonb_to_recordset(v_steps)
         AS n(sort_order integer, title text, description text, link_url text, link_label text)
   WHERE NOT EXISTS (SELECT 1 FROM public.steps AS s
                      WHERE s.procedure_id = v_id AND s.sort_order = n.sort_order);

  -- Documents, matched by sort_order.
  DELETE FROM public.documents AS d
   WHERE d.procedure_id = v_id
     AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset(v_documents) AS n(sort_order integer)
                      WHERE n.sort_order = d.sort_order);
  UPDATE public.documents AS d
     SET name = n.name, description = n.description,
         is_required = n.is_required, note = n.note
    FROM jsonb_to_recordset(v_documents)
         AS n(sort_order integer, name text, description text, is_required boolean, note text)
   WHERE d.procedure_id = v_id AND d.sort_order = n.sort_order
     AND (d.name, d.description, d.is_required, d.note)
         IS DISTINCT FROM (n.name, n.description, n.is_required, n.note);
  INSERT INTO public.documents (procedure_id, sort_order, name, description, is_required, note)
  SELECT v_id, n.sort_order, n.name, n.description, n.is_required, n.note
    FROM jsonb_to_recordset(v_documents)
         AS n(sort_order integer, name text, description text, is_required boolean, note text)
   WHERE NOT EXISTS (SELECT 1 FROM public.documents AS d
                      WHERE d.procedure_id = v_id AND d.sort_order = n.sort_order);

  -- Institution links, matched by institution id.
  DELETE FROM public.procedure_institutions AS pi
   WHERE pi.procedure_id = v_id
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_institutions) AS i(id)
                      WHERE i.id::uuid = pi.institution_id);
  INSERT INTO public.procedure_institutions AS pi (procedure_id, institution_id, note)
  SELECT v_id, i.id::uuid, v_notes ->> i.id
    FROM jsonb_array_elements_text(v_institutions) AS i(id)
  ON CONFLICT (procedure_id, institution_id) DO UPDATE
     SET note = EXCLUDED.note
   WHERE pi.note IS DISTINCT FROM EXCLUDED.note;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.admin_save_procedure(jsonb, uuid) IS
  'Creates (p_id NULL) or replaces a procedure with its steps, documents and institution links in one transaction. Runs as the caller: RLS, write guard and audit apply.';


-- Replaces the procedure list of a life event (03 LifeEventProceduresWrite).
-- Links missing from the list are deleted; their dependencies in this event
-- go with them through the FK cascade, and every deletion is audited. Raises
-- P0002 when the event does not exist (or the caller cannot see it).
CREATE FUNCTION public.admin_set_life_event_procedures(p_life_event_id uuid, p_procedures jsonb)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.life_events AS e WHERE e.id = p_life_event_id) THEN
    RAISE EXCEPTION 'life event % not found', p_life_event_id USING ERRCODE = 'P0002';
  END IF;

  -- Same lock as the dependency cycle check, so a concurrent dependency insert
  -- cannot reference a link this call is removing.
  PERFORM pg_advisory_xact_lock(hashtextextended('procedure_dependencies:' || p_life_event_id::text, 0));

  DELETE FROM public.life_event_procedures AS lep
   WHERE lep.life_event_id = p_life_event_id
     AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset(p_procedures) AS n(procedure_id uuid)
                      WHERE n.procedure_id = lep.procedure_id);
  UPDATE public.life_event_procedures AS lep
     SET sort_order = n.sort_order
    FROM jsonb_to_recordset(p_procedures) AS n(procedure_id uuid, sort_order integer)
   WHERE lep.life_event_id = p_life_event_id
     AND lep.procedure_id = n.procedure_id
     AND lep.sort_order <> n.sort_order;
  INSERT INTO public.life_event_procedures (life_event_id, procedure_id, sort_order)
  SELECT p_life_event_id, n.procedure_id, n.sort_order
    FROM jsonb_to_recordset(p_procedures) AS n(procedure_id uuid, sort_order integer)
  ON CONFLICT (life_event_id, procedure_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.admin_set_life_event_procedures(uuid, jsonb) IS
  'Replaces a life event''s procedure links and order in one transaction. Runs as the caller: RLS, write guard and audit apply.';


-- Query counts per matched life event for the admin "top topics" view (UF-10,
-- 03 adminAiQueryStats). SECURITY INVOKER: only rows the caller may read under
-- RLS (admins) are counted. from is inclusive, to exclusive; NULL = unbounded.
CREATE FUNCTION public.admin_ai_query_stats(p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
RETURNS TABLE (life_event_id uuid, slug text, title text, count bigint, unanswered_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT q.matched_event_id, e.slug::text, e.title::text,
         count(*), count(*) FILTER (WHERE NOT q.was_answered)
    FROM public.ai_queries AS q
    LEFT JOIN public.life_events AS e ON e.id = q.matched_event_id
   WHERE (p_from IS NULL OR q.created_at >= p_from)
     AND (p_to IS NULL OR q.created_at < p_to)
   GROUP BY q.matched_event_id, e.slug, e.title
   ORDER BY count(*) DESC, e.title NULLS LAST
$$;

COMMENT ON FUNCTION public.admin_ai_query_stats(timestamptz, timestamptz) IS
  'AI query counts per matched life event (NULL = no match), highest first. Runs under the caller''s RLS.';


-- Supabase grants EXECUTE on new public functions to every API role by default.
REVOKE ALL ON FUNCTION public.admin_save_procedure(jsonb, uuid)              FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.admin_set_life_event_procedures(uuid, jsonb)       FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.admin_ai_query_stats(timestamptz, timestamptz)     FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_procedure(jsonb, uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_life_event_procedures(uuid, jsonb)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_query_stats(timestamptz, timestamptz)  TO authenticated;
