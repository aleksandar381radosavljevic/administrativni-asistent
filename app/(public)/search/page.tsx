// app/(public)/search/page.tsx
// Stranica sa rezultatima pretrage
// Usklađenost: UF-02, sekcija 2 iz 08-screen-specifications.md

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { SearchBar } from '@/components/public/SearchBar';
import { HomeEventCard } from '@/components/public/HomeEventCard';
import { ProcedureCard } from '@/components/public/ProcedureCard';
import { InstitutionCard } from '@/components/public/InstitutionCard';
import { EmptyState } from '@/components/public/EmptyState';
import { ErrorState } from '@/components/public/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { SearchResult, LifeEventSummary, ProcedureSummary, InstitutionSummary } from '@/types/api';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-cream">
          <div className="mx-auto max-w-[420px] px-4 py-6 md:max-w-2xl md:px-6 lg:max-w-4xl">
            <Skeleton className="h-12 rounded-lg" />
          </div>
        </main>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Performuj pretragu kada se query promeni
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Pozovi search API
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Search failed');
        return res.json();
      })
      .then((data: SearchResult) => {
        setResults(data);
      })
      .catch((err) => {
        console.error('Search error:', err);
        setError('Greška pri pretrazi. Pokušajte ponovo.');
      })
      .finally(() => setLoading(false));
  }, [query]);

  // Debounce pretragu tokom unosa (opciono)
  const handleSearch = (newQuery: string) => {
    const params = new URLSearchParams();
    if (newQuery) {
      params.set('q', newQuery);
    }
    router.push(`/search?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-[420px] px-4 py-6 md:max-w-2xl md:px-6 lg:max-w-4xl">
        {/* Header sa Back navigation */}
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="text-caption text-ink-muted hover:text-ink focus-ring rounded"
          >
            ← Početna
          </button>
        </div>

        {/* Search Bar */}
        <SearchBar value={query} onChange={handleSearch} />

        {/* Results Label */}
        {query && (
          <p className="mb-6 text-caption text-ink-muted">
            Rezultati za: <span className="font-semibold text-ink">{query}</span>
          </p>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <ErrorState
            title="Greška pri pretrazi"
            description={error}
            onRetry={() => handleSearch(query)}
          />
        )}

        {/* Empty State */}
        {!loading && !error && query && results && results.total_count === 0 && (
          <EmptyState
            icon="🔍"
            title="Nema rezultata"
            description={`Nema rezultata za "${query}". Pokušajte sa drugim pojmom ili pregledate kategorije.`}
            ctaLabel="Nazad na početnu"
            onCta={() => router.push('/')}
          />
        )}

        {/* Results */}
        {!loading && !error && results && results.total_count > 0 && (
          <>
            {/* Life Events */}
            {results.life_events && results.life_events.length > 0 && (
              <section className="mb-8">
                <h2 className="section-label mb-4">Životni događaji</h2>
                <div className="space-y-3">
                  {results.life_events.map((event: LifeEventSummary) => (
                    <Link
                      key={event.id}
                      href={`/${event.slug}`}
                      className="block focus-ring rounded-lg"
                    >
                      <HomeEventCard event={event} />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Procedures */}
            {results.procedures && results.procedures.length > 0 && (
              <section className="mb-8">
                <h2 className="section-label mb-4">Procedure</h2>
                <div className="space-y-3">
                  {results.procedures.map((proc: ProcedureSummary) => (
                    <Link
                      key={proc.id}
                      href={`/procedure/${proc.slug}`}
                      className="block focus-ring rounded-lg"
                    >
                      <ProcedureCard procedure={proc} />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Institutions */}
            {results.institutions && results.institutions.length > 0 && (
              <section className="mb-8">
                <h2 className="section-label mb-4">Institucije</h2>
                <div className="space-y-3">
                  {results.institutions.map((inst: InstitutionSummary) => (
                    <div key={inst.id}>
                      <InstitutionCard institution={inst} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Empty query state */}
        {!query && (
          <EmptyState
            icon="🔍"
            title="Započni pretragu"
            description="Unesi pojam u polje iznad da pronađeš procedure i životne događaje."
          />
        )}

        {/* Footer Spacing */}
        <div className="h-12" />
      </div>
    </main>
  );
}
