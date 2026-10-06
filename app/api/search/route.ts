// app/api/search/route.ts
// Full-text search endpoint sa sinonima mapiranjem
// Usklađenost: UF-02, sekcija 5.3 iz 00-product-spec.md

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { SearchResult } from '@/types/api';

// Inicijalizuj Supabase klijent sa anon ključem (za RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/search?q=pasoš
 *
 * Pretraživanje po tri entiteta: life_events, procedures, institutions
 * Mapira sinonime pre pretrage (npr. "karton" → "izvod iz matične knjige")
 * Vraća rezultate grupisane po tipu
 *
 * Validacije:
 * - Minimum 2 karaktera
 * - Maximum 100 karaktera
 * - Rezultati < 1 sekunde (nefunkcionalni zahtev)
 */
export async function GET(request: NextRequest) {
  try {
    // Preuzmite query parametar
    const searchParams = request.nextUrl.searchParams;
    const originalQuery = searchParams.get('q')?.trim() || '';

    // Validacija: minimum 2 karaktera
    if (!originalQuery || originalQuery.length < 2) {
      return NextResponse.json(
        {
          error: 'bad_request',
          message: 'Parametar q je obavezan i mora imati najmanje 2 karaktera.',
        },
        { status: 400 }
      );
    }

    // Validacija: maximum 100 karaktera
    if (originalQuery.length > 100) {
      return NextResponse.json(
        {
          error: 'bad_request',
          message: 'Parametar q ne sme biti duži od 100 karaktera.',
        },
        { status: 400 }
      );
    }

    // Korak 1: Mapiranje sinonima
    const mappedQuery = await mapSynonym(originalQuery);
    const searchQuery = mappedQuery.maps_to || originalQuery;

    // Korak 2: Full-text search po tri entiteta
    const [lifeEventsResult, proceduresResult, institutionsResult] =
      await Promise.all([
        searchLifeEvents(searchQuery),
        searchProcedures(searchQuery),
        searchInstitutions(searchQuery),
      ]);

    // Korak 3: Formiranje odgovora
    const result: SearchResult = {
      query: searchQuery,
      original_query: originalQuery,
      life_events: (lifeEventsResult.data || []).map((lifeEvent) => ({
        ...lifeEvent,
        category: lifeEvent.category?.[0],
      })),
      procedures: proceduresResult.data || [],
      institutions: institutionsResult.data || [],
      total_count: (lifeEventsResult.data?.length || 0) +
        (proceduresResult.data?.length || 0) +
        (institutionsResult.data?.length || 0),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Search API error:', error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Greška pri pretrazi. Pokušajte ponovo.',
      },
      { status: 500 }
    );
  }
}

/**
 * Mapiranje sinonima
 * Proverava da li je termin mapiran na standardni naziv
 * Primer: "karton" → "izvod iz matične knjige"
 */
async function mapSynonym(
  term: string
): Promise<{ term: string; maps_to: string | null }> {
  const { data, error } = await supabase
    .from('synonyms')
    .select('term, maps_to')
    .eq('term', term.toLowerCase())
    .single();

  if (error || !data) {
    // Sinonim nije pronađen - koristi originalni termin
    return { term, maps_to: null };
  }

  return { term: data.term, maps_to: data.maps_to };
}

/**
 * Pretraga životnih događaja
 * PostgreSQL full-text search sa srpskim rečnikom
 * Samo `published` status (RLS)
 */
async function searchLifeEvents(query: string) {
  return supabase
    .from('life_events')
    .select(
      `
      id,
      title,
      description,
      slug,
      icon,
      status,
      category:categories(id, name, slug)
    `
    )
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(5);
}

/**
 * Pretraga procedura
 * Samo `published` status (RLS)
 */
async function searchProcedures(query: string) {
  return supabase
    .from('procedures')
    .select(
      `
      id,
      title,
      description,
      slug,
      can_online,
      can_in_person,
      can_by_mail,
      cost_amount,
      processing_time,
      status,
      is_stale,
      last_verified_at
    `
    )
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(5);
}

/**
 * Pretraga institucija
 * Samo `published` status (RLS)
 */
async function searchInstitutions(query: string) {
  return supabase
    .from('institutions')
    .select(
      `
      id,
      name,
      slug,
      website,
      phone,
      email,
      working_hours,
      status
    `
    )
    .eq('status', 'published')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(5);
}
