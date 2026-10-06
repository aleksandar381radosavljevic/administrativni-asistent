-- Administrativni Asistent - PostgreSQL Schema
-- Version 1.0, June 2026
-- Supabase PostgreSQL with Row Level Security (RLS)

-- ============================================================================
-- ENUMS & TYPES
-- ============================================================================

CREATE TYPE content_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'archive'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- categories - Kategorije životnih događaja
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- life_events - Životni događaji (npr. "Selim se")
CREATE TABLE public.life_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  slug VARCHAR(200) NOT NULL UNIQUE,
  status content_status NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- institutions - Državne institucije (npr. MUP)
CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  website VARCHAR(500),
  phone VARCHAR(50),
  email VARCHAR(200),
  working_hours TEXT,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- procedures - Administrativne procedure (centralni entitet)
CREATE TABLE public.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  slug VARCHAR(200) NOT NULL UNIQUE,
  can_online BOOLEAN NOT NULL DEFAULT FALSE,
  can_in_person BOOLEAN NOT NULL DEFAULT TRUE,
  can_by_mail BOOLEAN NOT NULL DEFAULT FALSE,
  cost_amount NUMERIC(10, 2),
  cost_description TEXT,
  processing_time VARCHAR(200),
  official_link VARCHAR(500),
  form_link VARCHAR(500),
  status content_status NOT NULL DEFAULT 'draft',
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT at_least_one_method CHECK (can_online OR can_in_person OR can_by_mail)
);

-- steps - Numerisani koraci unutar procedure
CREATE TABLE public.steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  link_url VARCHAR(500),
  link_label VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- documents - Dokumenta potrebna za procedure
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  name VARCHAR(300) NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- synonyms - Mapiranje žargona na standardne termine
CREATE TABLE public.synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term VARCHAR(200) NOT NULL UNIQUE,
  maps_to VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit_log - Nepromenjiv log svih izmena
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action audit_action NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  diff JSONB
);

-- ai_queries - Anonimni upiti korisnika
CREATE TABLE public.ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  was_answered BOOLEAN NOT NULL DEFAULT FALSE,
  matched_event_id UUID REFERENCES public.life_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- JUNCTION TABLES (N:M RELATIONS)
-- ============================================================================

-- life_event_procedures - Veza između životnih događaja i procedura
CREATE TABLE public.life_event_procedures (
  life_event_id UUID NOT NULL REFERENCES public.life_events(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (life_event_id, procedure_id)
);

-- procedure_institutions - Veza između procedura i institucija
CREATE TABLE public.procedure_institutions (
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  note TEXT,
  PRIMARY KEY (procedure_id, institution_id)
);

-- procedure_dependencies - Zavisnosti između procedura
CREATE TABLE public.procedure_dependencies (
  life_event_id UUID NOT NULL REFERENCES public.life_events(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  PRIMARY KEY (life_event_id, procedure_id, depends_on_id),
  
  CONSTRAINT no_self_dependency CHECK (procedure_id != depends_on_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_life_events_status ON public.life_events(status);
CREATE INDEX idx_life_events_category ON public.life_events(category_id, status);
CREATE INDEX idx_procedures_status ON public.procedures(status);
CREATE INDEX idx_procedures_last_verified ON public.procedures(last_verified_at);
CREATE INDEX idx_steps_procedure ON public.steps(procedure_id, sort_order);
CREATE INDEX idx_documents_procedure ON public.documents(procedure_id);
CREATE INDEX idx_ai_queries_answered ON public.ai_queries(was_answered, created_at);
CREATE INDEX idx_synonyms_term ON public.synonyms(term);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_timestamp ON public.audit_log(changed_at);
CREATE INDEX idx_life_event_procedures_event ON public.life_event_procedures(life_event_id, sort_order);
CREATE INDEX idx_procedure_dependencies_event ON public.procedure_dependencies(life_event_id, procedure_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_queries ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────
-- PUBLIC (ANON) POLICIES - Javni korisnici vide samo published sadržaj
-- ─────────────────────────────────────────────────────────────────────────

-- categories: svi mogu čitati
CREATE POLICY "public_select_categories"
ON public.categories FOR SELECT
TO anon
USING (TRUE);

-- life_events: samo published
CREATE POLICY "public_select_life_events"
ON public.life_events FOR SELECT
TO anon
USING (status = 'published');

-- institutions: samo published
CREATE POLICY "public_select_institutions"
ON public.institutions FOR SELECT
TO anon
USING (status = 'published');

-- procedures: samo published
CREATE POLICY "public_select_procedures"
ON public.procedures FOR SELECT
TO anon
USING (status = 'published');

-- steps: vide se ako je procedura published
CREATE POLICY "public_select_steps"
ON public.steps FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.procedures p
    WHERE p.id = procedure_id AND p.status = 'published'
  )
);

-- documents: vide se ako je procedura published
CREATE POLICY "public_select_documents"
ON public.documents FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.procedures p
    WHERE p.id = procedure_id AND p.status = 'published'
  )
);

-- synonyms: svi mogu čitati (za pretragu)
CREATE POLICY "public_select_synonyms"
ON public.synonyms FOR SELECT
TO anon
USING (TRUE);

-- ai_queries: anon može pisati (bez čitanja)
CREATE POLICY "public_insert_ai_queries"
ON public.ai_queries FOR INSERT
TO anon
WITH CHECK (TRUE);

-- Deny other operations for anon
CREATE POLICY "public_deny_write"
ON public.life_events FOR UPDATE TO anon USING (FALSE);
CREATE POLICY "public_deny_delete_events"
ON public.life_events FOR DELETE TO anon USING (FALSE);

-- ─────────────────────────────────────────────────────────────────────────
-- AUTHENTICATED (ADMIN) POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- life_events: admin vidi sve, može menjati
CREATE POLICY "admin_select_life_events"
ON public.life_events FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "admin_update_life_events"
ON public.life_events FOR UPDATE
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "admin_delete_life_events"
ON public.life_events FOR DELETE
TO authenticated
USING (TRUE);

CREATE POLICY "admin_insert_life_events"
ON public.life_events FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- institutions: admin vidi sve, može menjati
CREATE POLICY "admin_select_institutions"
ON public.institutions FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "admin_update_institutions"
ON public.institutions FOR UPDATE
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "admin_delete_institutions"
ON public.institutions FOR DELETE
TO authenticated
USING (TRUE);

CREATE POLICY "admin_insert_institutions"
ON public.institutions FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- procedures: admin vidi sve, može menjati
CREATE POLICY "admin_select_procedures"
ON public.procedures FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "admin_insert_procedures"
ON public.procedures FOR INSERT
TO authenticated
WITH CHECK (TRUE);

CREATE POLICY "admin_update_procedures"
ON public.procedures FOR UPDATE
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "admin_delete_procedures"
ON public.procedures FOR DELETE
TO authenticated
USING (TRUE);

-- steps: admin vidi sve, može menjati
CREATE POLICY "admin_select_steps"
ON public.steps FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "admin_insert_steps"
ON public.steps FOR INSERT
TO authenticated
WITH CHECK (TRUE);

CREATE POLICY "admin_update_steps"
ON public.steps FOR UPDATE
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "admin_delete_steps"
ON public.steps FOR DELETE
TO authenticated
USING (TRUE);

-- documents: admin vidi sve, može menjati
CREATE POLICY "admin_select_documents"
ON public.documents FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "admin_insert_documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (TRUE);

CREATE POLICY "admin_update_documents"
ON public.documents FOR UPDATE
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "admin_delete_documents"
ON public.documents FOR DELETE
TO authenticated
USING (TRUE);

-- synonyms: admin može menjati
CREATE POLICY "admin_select_synonyms"
ON public.synonyms FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "admin_insert_synonyms"
ON public.synonyms FOR INSERT
TO authenticated
WITH CHECK (TRUE);

CREATE POLICY "admin_update_synonyms"
ON public.synonyms FOR UPDATE
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

-- audit_log: samo insert (append-only), samo čitanje za admin
CREATE POLICY "admin_select_audit_log"
ON public.audit_log FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "admin_insert_audit_log"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- Deny update/delete on audit_log
CREATE POLICY "deny_update_audit_log"
ON public.audit_log FOR UPDATE
TO authenticated
USING (FALSE);

CREATE POLICY "deny_delete_audit_log"
ON public.audit_log FOR DELETE
TO authenticated
USING (FALSE);

-- ai_queries: admin može čitati sve
CREATE POLICY "admin_select_ai_queries"
ON public.ai_queries FOR SELECT
TO authenticated
USING (TRUE);

-- Junction tables: admin kontrola
CREATE POLICY "admin_manage_life_event_procedures"
ON public.life_event_procedures FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "admin_manage_procedure_institutions"
ON public.procedure_institutions FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "admin_manage_procedure_dependencies"
ON public.procedure_dependencies FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

-- ============================================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_life_events_updated_at BEFORE UPDATE ON public.life_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_procedures_updated_at BEFORE UPDATE ON public.procedures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_steps_updated_at BEFORE UPDATE ON public.steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FUNCTION: Check circular dependencies (before insert/update on procedure_dependencies)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_circular_dependency()
RETURNS TRIGGER AS $$
DECLARE
  v_has_cycle BOOLEAN;
BEGIN
  -- Recursive CTE to detect cycles
  WITH RECURSIVE dep_chain AS (
    -- Base: start from the new dependency
    SELECT NEW.procedure_id, NEW.depends_on_id, 1 AS depth
    WHERE NEW.life_event_id = NEW.life_event_id
    
    UNION ALL
    
    -- Recursive: follow dependencies
    SELECT dc.procedure_id, pd.depends_on_id, dc.depth + 1
    FROM dep_chain dc
    JOIN public.procedure_dependencies pd 
      ON pd.procedure_id = dc.depends_on_id 
      AND pd.life_event_id = NEW.life_event_id
    WHERE dc.depth < 100  -- Safeguard against infinite recursion
  )
  SELECT EXISTS(
    SELECT 1 FROM dep_chain 
    WHERE procedure_id = NEW.depends_on_id  -- If we reach the original procedure, cycle exists
  ) INTO v_has_cycle;
  
  IF v_has_cycle THEN
    RAISE EXCEPTION 'Circular dependency detected. Procedure % and % cannot form a cycle.',
      NEW.procedure_id, NEW.depends_on_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_circular_dependency_insert
BEFORE INSERT ON public.procedure_dependencies
FOR EACH ROW EXECUTE FUNCTION public.check_circular_dependency();

CREATE TRIGGER check_circular_dependency_update
BEFORE UPDATE ON public.procedure_dependencies
FOR EACH ROW EXECUTE FUNCTION public.check_circular_dependency();

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================

COMMENT ON TABLE public.procedures IS 'Centralni entitet sistema - sve ostalo gravitira ka procedurama';
COMMENT ON TABLE public.audit_log IS 'Append-only log svih izmena. Nikad se ne briše niti se update-a.';
COMMENT ON TABLE public.ai_queries IS 'Anonimni upiti korisnika. Koristi se za analizu nedostajućeg sadržaja.';
COMMENT ON CONSTRAINT no_self_dependency ON public.procedure_dependencies IS 'Procedura ne može zavisiti od same sebe';
COMMENT ON CONSTRAINT at_least_one_method ON public.procedures IS 'Procedura mora imati označenu najmanje jednu metodu obavljanja';
