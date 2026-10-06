// app/(admin)/admin/ai-queries/page.tsx
// Pregled AI upita korisnika - UF-10, UC-21

'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/clients';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

interface AiQueryRow {
  id: string;
  query_text: string;
  was_answered: boolean;
  created_at: string;
  matched_event: { id: string; title: string; slug: string } | null;
}

type FilterMode = 'all' | 'unanswered' | 'answered';

export default function AiQueriesPage() {
  const supabase = createSupabaseClient();
  const [queries, setQueries] = useState<AiQueryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');

  useEffect(() => {
    const fetchQueries = async () => {
      try {
        const { data, error: err } = await supabase
          .from('ai_queries')
          .select(
            'id, query_text, was_answered, created_at, matched_event:life_events(id, title, slug)'
          )
          .order('created_at', { ascending: false })
          .limit(200);

        if (err) throw err;
        setQueries(
          (data || []).map((query) => ({
            ...query,
            matched_event: query.matched_event?.[0] ?? null,
          }))
        );
      } catch (err) {
        setError('Greška pri učitavanju AI upita');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueries();
  }, [supabase]);

  const filteredQueries = useMemo(() => {
    if (filter === 'unanswered') return queries.filter((q) => !q.was_answered);
    if (filter === 'answered') return queries.filter((q) => q.was_answered);
    return queries;
  }, [queries, filter]);

  // Najčešća pitanja - jednostavna frekvencija po normalizovanom tekstu
  const topQuestions = useMemo(() => {
    const counts = new Map<string, number>();
    queries.forEach((q) => {
      const normalized = q.query_text.trim().toLowerCase();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });

    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [queries]);

  const unansweredCount = queries.filter((q) => !q.was_answered).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title font-bold">AI upiti</h1>
        <p className="text-body-sm text-ink-muted">
          Pregled pitanja koja su korisnici postavili AI asistentu (anonimno, bez ličnih podataka)
        </p>
      </div>

      {error && <Alert type="error" title="Greška">{error}</Alert>}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          {/* Statistika */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <p className="text-caption text-ink-muted font-bold mb-1">Ukupno upita</p>
              <p className="text-3xl font-bold text-ink">{queries.length}</p>
            </Card>
            <Card className={unansweredCount > 0 ? 'border-2 border-rust-soft bg-rust-soft/30' : ''}>
              <p className="text-caption font-bold mb-1">Bez odgovora</p>
              <p className={`text-3xl font-bold ${unansweredCount > 0 ? 'text-rust' : 'text-ink'}`}>
                {unansweredCount}
              </p>
            </Card>
            <Card>
              <p className="text-caption text-ink-muted font-bold mb-1">Stopa odgovora</p>
              <p className="text-3xl font-bold text-ink">
                {queries.length > 0
                  ? Math.round(((queries.length - unansweredCount) / queries.length) * 100)
                  : 100}
                %
              </p>
            </Card>
          </div>

          {/* Najčešća pitanja */}
          {topQuestions.length > 0 && (
            <Card>
              <h2 className="text-heading font-bold mb-3">Najčešća pitanja</h2>
              <div className="space-y-2">
                {topQuestions.map(([text, count]) => (
                  <div
                    key={text}
                    className="flex items-center justify-between gap-3 rounded-lg bg-cream px-3 py-2"
                  >
                    <p className="text-body-sm text-ink capitalize">{text}</p>
                    <Badge variant="optional">{count}×</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Filter */}
          <div className="flex gap-2">
            {(['all', 'unanswered', 'answered'] as FilterMode[]).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={filter === mode ? 'primary' : 'secondary'}
                onClick={() => setFilter(mode)}
              >
                {mode === 'all' && 'Sve'}
                {mode === 'unanswered' && 'Bez odgovora'}
                {mode === 'answered' && 'Sa odgovorom'}
              </Button>
            ))}
          </div>

          {/* Lista upita */}
          {filteredQueries.length === 0 ? (
            <Card className="text-center py-12">
              <MessageSquare className="h-10 w-10 text-ink-muted mx-auto mb-3" />
              <p className="text-ink-muted">
                {filter === 'unanswered'
                  ? 'Nema otvorenih upita bez odgovora.'
                  : 'Nema upita za prikaz.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredQueries.map((q) => (
                <Card key={q.id} className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-body text-ink mb-1">{q.query_text}</p>
                    <div className="flex items-center gap-2 text-caption text-ink-muted">
                      <span>{new Date(q.created_at).toLocaleString('sr-RS')}</span>
                      {q.matched_event && (
                        <>
                          <span>·</span>
                          <Link
                            href={`/admin/life-events/${q.matched_event.id}/edit`}
                            className="text-amber hover:text-amber/80"
                          >
                            {q.matched_event.title}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant={q.was_answered ? 'success' : 'error'}>
                    {q.was_answered ? 'Odgovoreno' : 'Bez odgovora'}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}