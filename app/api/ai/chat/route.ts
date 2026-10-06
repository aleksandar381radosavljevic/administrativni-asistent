// app/api/ai/chat/route.ts
// AI asistent endpoint sa kontekstom iz baze
// Usklađenost: UF-03, UF-12, UF-13, sekcija 4.2 iz 04-architecture.md

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

// Supabase - service role za server-side (pisanje u ai_queries)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Supabase - anon za čitanje (RLS)
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Rate limiting: In-memory store (nije za produkciju - trebalo bi Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 10; // upita po satu
const RATE_LIMIT_WINDOW = 3600000; // 1 sat u ms

interface AiChatRequest {
  message: string;
}

interface AiChatResponse {
  answer: string;
  was_answered: boolean;
  matched_life_event?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  related_procedures?: Array<{
    id: string;
    title: string;
    slug: string;
    can_online: boolean;
    can_in_person: boolean;
    can_by_mail: boolean;
    cost_amount: number | null;
    processing_time: string | null;
  }>;
}

/**
 * POST /api/ai/chat
 *
 * Korisnik postavlja pitanje. AI asistent:
 * 1. Pretraži bazu za relevantne procedure (top 3-5)
 * 2. Pozove Claude API sa kontekstom
 * 3. Vrati odgovor sa povezanim procedurama
 * 4. Loguj upit u ai_queries tabelu
 *
 * Rate limit: 10 upita/IP/sat
 * Timeout: ~10 sekundi
 */
export async function POST(request: NextRequest) {
  try {
    // Preuzmite IP adresu za rate limiting
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-client-ip') ||
      'unknown';

    // Korak 1: Rate limit provera
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: 'Previše zahteva. Pokušajte ponovo za nekoliko minuta.',
        },
        { status: 429 }
      );
    }

    // Korak 2: Parse zahtev
    const body = (await request.json()) as AiChatRequest;
    const { message } = body;

    // Validacija
    if (!message || message.trim().length < 3) {
      return NextResponse.json(
        {
          error: 'bad_request',
          message: 'Poruka mora imati najmanje 3 karaktera.',
        },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        {
          error: 'bad_request',
          message: 'Poruka ne sme biti duža od 1000 karaktera.',
        },
        { status: 400 }
      );
    }

    // Korak 3: Pronađi relevantne procedure iz baze (top 5)
    const { relatedProcedures, matchedEventId } = await findRelevantProcedures(
      message
    );

    // Korak 4: Formira kontekst za AI
    const context = buildAiContext(relatedProcedures, message);

    // Korak 5: Pozove Claude API
    const aiResponse = await callClaudeApi(context, message);

    // Korak 6: Loguj upit u ai_queries (bez ličnih podataka)
    const wasAnswered = relatedProcedures.length > 0;
    await logAiQuery(message, wasAnswered, matchedEventId);

    // Korak 7: Formira odgovor
    const response: AiChatResponse = {
      answer: aiResponse,
      was_answered: wasAnswered,
      matched_life_event: matchedEventId
        ? {
          id: matchedEventId.id,
          title: matchedEventId.title,
          slug: matchedEventId.slug,
        }
        : null,
      related_procedures: relatedProcedures,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI Chat API error:', error);

    // Loguuj grešku u Sentry (opciono)
    // captureException(error);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Greška pri slanju poruke. Pokušajte ponovo.',
      },
      { status: 500 }
    );
  }
}

/**
 * Rate limiting provera - In-memory (za produkciju koristiti Redis)
 */
function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(clientIp);

  if (!record || now > record.resetAt) {
    // Nova ili istekla vremenska serijal
    rateLimitStore.set(clientIp, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Pronalaženje relevantnih procedura za AI kontekst
 * Koristi PostgreSQL full-text search
 */
async function findRelevantProcedures(query: string): Promise<{
  relatedProcedures: Array<{
    id: string;
    title: string;
    slug: string;
    can_online: boolean;
    can_in_person: boolean;
    can_by_mail: boolean;
    cost_amount: number | null;
    processing_time: string | null;
  }>;
  matchedEventId: { id: string; title: string; slug: string } | null;
}> {
  try {
    // Prvo pokušaj pronađi procedure
    const { data: procedures, error: procError } = await supabaseAnon
      .from('procedures')
      .select(
        `
        id,
        title,
        slug,
        can_online,
        can_in_person,
        can_by_mail,
        cost_amount,
        processing_time
      `
      )
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(5);
    if (procError) throw procError;

    // Zatim pokušaj pronađi životni događaj
    const { data: events, error: eventsError } = await supabaseAnon
      .from('life_events')
      .select('id, title, slug')
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(1);
    if (eventsError) throw eventsError;

    return {
      relatedProcedures: procedures || [],
      matchedEventId: events?.[0] || null,
    };
  } catch (error) {
    console.error('Error finding relevant procedures:', error);
    throw error;
  }
}

/**
 * Formiranje konteksta za AI iz relevantnih procedura
 */
function buildAiContext(
  procedures: Array<{
    id: string;
    title: string;
    slug: string;
    can_online: boolean;
    can_in_person: boolean;
    can_by_mail: boolean;
    cost_amount: number | null;
    processing_time: string | null;
  }>,
  userQuery: string
): string {
  if (procedures.length === 0) {
    return `
Korisnikovo pitanje: "${userQuery}"

BAZA ZNANJA: Nema pronađenih procedura za ovo pitanje.
Odgovori da nemaš tu informaciju i preporuči direktan kontakt sa institucijom.
    `.trim();
  }

  const procedureList = procedures
    .map(
      (proc) => `
- ${proc.title}
  Mogu biti obavljeno: ${getProcedureMethods(proc)}
  Troškak: ${proc.cost_amount ? `${proc.cost_amount} din` : 'Besplatno'}
  Vreme: ${proc.processing_time || 'Nije navedeno'}
  Link: /procedure/${proc.slug}
    `.trim()
    )
    .join('\n\n');

  return `
Korisnikovo pitanje: "${userQuery}"

BAZA ZNANJA - Relevantne procedure:
${procedureList}

Odgovori na osnovu ovih procedura. Ako informacija nije dostupna, nemoj izmišljati.
Obavezno koristi srpski jezik za odgovor.
  `.trim();
}

/**
 * Formatiranje metoda obavljanja procedure
 */
function getProcedureMethods(proc: {
  can_online: boolean;
  can_in_person: boolean;
  can_by_mail: boolean;
}): string {
  const methods = [];
  if (proc.can_online) methods.push('Online');
  if (proc.can_in_person) methods.push('Lično');
  if (proc.can_by_mail) methods.push('Poštom');
  return methods.join(', ') || 'Nije dostupno';
}

/**
 * Poziv Claude API-ja
 * Temperature: 0 - konzistentni odgovori bez kreativnosti
 * Max tokens: 1024
 */
async function callClaudeApi(context: string, userMessage: string): Promise<string> {
  const systemPrompt = `
Ti si administrativni asistent koji pomaže građanima Srbije.
Odgovaraj ISKLJUČIVO na osnovu sledećeg sadržaja iz baze.
Ne koristi external knowledge.
Ne daj pravne savete.
Ako informacija ne postoji u priloženom sadržaju, odgovori:
"Nemam tu informaciju u bazi znanja. Preporučujem da proverite direktno kod nadležne institucije."
Odgovaraj na srpskom jeziku.
`.trim();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${context}\n\nKorisnikovo pitanje: ${userMessage}`,
        },
      ],
    });

    // Ekstraktuj tekstualni odgovor
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent) {
      throw new Error('Anthropic response did not contain a text block.');
    }
    return textContent.text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

/**
 * Logovanje AI upita u bazu (bez ličnih podataka)
 */
async function logAiQuery(
  queryText: string,
  wasAnswered: boolean,
  matchedEventId: { id: string } | null
): Promise<void> {
  try {
    await supabaseAdmin.from('ai_queries').insert({
      query_text: queryText,
      was_answered: wasAnswered,
      matched_event_id: matchedEventId?.id || null,
    });
  } catch (error) {
    console.error('Error logging AI query:', error);
    // Nema greške prema korisniku - samo loguj
  }
}
