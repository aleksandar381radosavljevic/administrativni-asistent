// app/(admin)/admin/warnings/page.tsx
// Upozorenja o zastarelim procedurama - UF-10, PR-07, ES-01

'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/clients';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { formatTimeDifference } from '@/lib/utils/api';

interface StaleProcedure {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  last_verified_at: string | null;
}

const STALE_THRESHOLD_MONTHS = 6;

export default function WarningsPage() {
  const supabase = createSupabaseClient();
  const [procedures, setProcedures] = useState<StaleProcedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchStale = async () => {
    setIsLoading(true);
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - STALE_THRESHOLD_MONTHS);

      // Procedure koje nikad nisu provrene ILI su provrene pre > 6 meseci
      const { data, error: err } = await supabase
        .from('procedures')
        .select('id, title, slug, status, last_verified_at')
        .neq('status', 'archived')
        .or(`last_verified_at.is.null,last_verified_at.lt.${sixMonthsAgo.toISOString()}`)
        .order('last_verified_at', { ascending: true, nullsFirst: true });

      if (err) throw err;
      setProcedures(data || []);
    } catch (err) {
      setError('Greška pri učitavanju upozorenja');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkVerified = async (id: string) => {
    setUpdatingId(id);
    try {
      const { error: updateError } = await supabase
        .from('procedures')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      // Ukloni iz liste upozorenja (PR-07 - ažurirana procedura ne prikazuje upozorenje)
      setProcedures((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError('Greška pri ažuriranju datuma provere');
    } finally {
      setUpdatingId(null);
    }
  };

  const neverVerified = useMemo(
    () => procedures.filter((p) => !p.last_verified_at),
    [procedures]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title font-bold">Upozorenja</h1>
        <p className="text-body-sm text-ink-muted">
          Procedure starije od {STALE_THRESHOLD_MONTHS} meseci bez administratorove provere
        </p>
      </div>

      {error && <Alert type="error" title="Greška">{error}</Alert>}

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : procedures.length === 0 ? (
        <Card className="text-center py-12">
          <CheckCircle className="h-10 w-10 text-sage mx-auto mb-3" />
          <p className="text-heading font-bold text-ink mb-1">Sav sadržaj je ažuran</p>
          <p className="text-body-sm text-ink-muted">
            Nema procedura koje čekaju proveru.
          </p>
        </Card>
      ) : (
        <>
          {neverVerified.length > 0 && (
            <Alert type="error" title="Hitno">
              {neverVerified.length}{' '}
              {neverVerified.length === 1 ? 'procedura' : 'procedure'} nikad nije provrena od
              kreiranja.
            </Alert>
          )}

          <div className="space-y-2">
            {procedures.map((proc) => (
              <Card key={proc.id} className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <AlertTriangle className="h-5 w-5 text-honey flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-body font-bold text-ink">{proc.title}</p>
                    <p className="text-caption text-ink-muted">
                      {proc.last_verified_at
                        ? `Poslednja provera: ${formatTimeDifference(proc.last_verified_at)}`
                        : 'Nikad provereno'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={proc.status === 'published' ? 'success' : 'optional'}>
                    {proc.status === 'published' ? 'Objavljeno' : 'Nacrt'}
                  </Badge>
                  <Link href={`/admin/procedures/${proc.id}/edit`}>
                    <Button variant="secondary" size="sm">
                      Uredi
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => handleMarkVerified(proc.id)}
                    disabled={updatingId === proc.id}
                  >
                    {updatingId === proc.id ? 'Čuvam...' : 'Označi kao provereno'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
