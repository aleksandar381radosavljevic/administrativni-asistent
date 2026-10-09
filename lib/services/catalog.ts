import "server-only";
import { mapDbError } from "@/lib/api/errors";
import { createAnonClient } from "@/lib/supabase/anon";

// The content catalog for the AI assistant (ADR 0006, 04 §4.3): ids, slugs
// and titles of everything public, plus the synonyms. Read with the anon
// client, so RLS limits it to published content and hides procedures that
// are in no published life event (PR-05).

export interface CatalogLifeEvent {
  id: string;
  slug: string;
  title: string;
  /** Public procedures of the event, by id. */
  procedure_ids: string[];
}

export interface CatalogProcedure {
  id: string;
  slug: string;
  title: string;
}

export interface CatalogSynonym {
  term: string;
  maps_to: string;
}

export interface Catalog {
  life_events: CatalogLifeEvent[];
  procedures: CatalogProcedure[];
  synonyms: CatalogSynonym[];
}

interface LifeEventRow {
  id: string;
  slug: string;
  title: string;
  life_event_procedures: { procedure_id: string }[];
}

/**
 * Loads the catalog, ordered by id everywhere (uuid order in Postgres is
 * the order of the lowercase hex text). Why so strict: the catalog is
 * the cached prompt prefix, and any change in order would be a cache miss.
 */
export async function getCatalog(): Promise<Catalog> {
  const client = createAnonClient();
  const [events, procedures, synonyms] = await Promise.all([
    // `!inner`: an event whose procedures are all hidden is hidden too, as
    // on the public pages (open question 1).
    client
      .from("life_events")
      .select("id, slug, title, life_event_procedures!inner(procedure_id)")
      .order("id")
      .overrideTypes<LifeEventRow[], { merge: false }>(),
    client.from("procedures").select("id, slug, title").order("id"),
    client.from("synonyms").select("id, term, maps_to").order("id"),
  ]);
  for (const result of [events, procedures, synonyms]) {
    if (result.error) throw mapDbError(result.error);
  }

  return {
    life_events: (events.data ?? []).map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      // Embedded rows come in no guaranteed order.
      procedure_ids: event.life_event_procedures
        .map((link) => link.procedure_id)
        .sort(),
    })),
    procedures: procedures.data ?? [],
    synonyms: (synonyms.data ?? []).map(({ term, maps_to }) => ({
      term,
      maps_to,
    })),
  };
}
