// app/(admin)/admin/page.tsx
// Admin dashboard

'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/clients';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileText, Users, Building2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';

interface DashboardStats {
  life_events_count: number;
  procedures_count: number;
  institutions_count: number;
  stale_procedures_count: number;
  unanswered_ai_queries: number;
}

export default function AdminDashboard() {
  const supabase = createSupabaseClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Životni događaji
        const { count: lifEventsCount } = await supabase
          .from('life_events')
          .select('*', { count: 'exact' })
          .eq('status', 'published');

        // Procedure
        const { count: proceduresCount } = await supabase
          .from('procedures')
          .select('*', { count: 'exact' })
          .eq('status', 'published');

        // Institucije
        const { count: institutionsCount } = await supabase
          .from('institutions')
          .select('*', { count: 'exact' })
          .eq('status', 'published');

        // Zastarele procedure
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { count: staleProceduresCount } = await supabase
          .from('procedures')
          .select('*', { count: 'exact' })
          .lt('last_verified_at', sixMonthsAgo.toISOString());

        // AI upiti bez odgovora
        const { count: unansweredQueriesCount } = await supabase
          .from('ai_queries')
          .select('*', { count: 'exact' })
          .eq('was_answered', false);

        setStats({
          life_events_count: lifEventsCount || 0,
          procedures_count: proceduresCount || 0,
          institutions_count: institutionsCount || 0,
          stale_procedures_count: staleProceduresCount || 0,
          unanswered_ai_queries: unansweredQueriesCount || 0,
        });
      } catch (err) {
        setError('Greška pri učitavanju statistike');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-display font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display font-bold mb-2">Dashboard</h1>
        <p className="text-body-sm text-ink-muted">
          Pregled stanja i brzih akcija
        </p>
      </div>

      {error && (
        <Alert type="error" title="Greška">{error}</Alert>
      )}

      {/* Kartice sa statistikom */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Životni događaji */}
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-caption text-ink-muted font-bold">Životni događaji</p>
            <FileText className="h-5 w-5 text-amber" />
          </div>
          <p className="text-3xl font-bold text-ink">{stats?.life_events_count || 0}</p>
          <Link href="/admin/life-events/new">
            <Button variant="ghost" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Dodaj novo
            </Button>
          </Link>
        </Card>

        {/* Procedure */}
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-caption text-ink-muted font-bold">Procedure</p>
            <Users className="h-5 w-5 text-sage" />
          </div>
          <p className="text-3xl font-bold text-ink">{stats?.procedures_count || 0}</p>
          <Link href="/admin/procedures/new">
            <Button variant="ghost" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Dodaj novu
            </Button>
          </Link>
        </Card>

        {/* Institucije */}
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-caption text-ink-muted font-bold">Institucije</p>
            <Building2 className="h-5 w-5 text-honey" />
          </div>
          <p className="text-3xl font-bold text-ink">{stats?.institutions_count || 0}</p>
          <Link href="/admin/institutions/new">
            <Button variant="ghost" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Dodaj novu
            </Button>
          </Link>
        </Card>

        {/* Zastarele procedure */}
        <Card className="space-y-2 border-2 border-honey-soft bg-honey-soft/30">
          <div className="flex items-center justify-between">
            <p className="text-caption font-bold">Zastarele procedure</p>
            <AlertTriangle className="h-5 w-5 text-honey" />
          </div>
          <p className="text-3xl font-bold text-honey">{stats?.stale_procedures_count || 0}</p>
          <Link href="/admin/warnings">
            <Button variant="ghost" size="sm" className="w-full">
              Pregled
            </Button>
          </Link>
        </Card>

        {/* Neozbunjeni AI upiti */}
        <Card className="space-y-2 border-2 border-rust-soft bg-rust-soft/30">
          <div className="flex items-center justify-between">
            <p className="text-caption font-bold">AI upiti bez odgovora</p>
            <AlertTriangle className="h-5 w-5 text-rust" />
          </div>
          <p className="text-3xl font-bold text-rust">{stats?.unanswered_ai_queries || 0}</p>
          <Link href="/admin/ai-queries">
            <Button variant="ghost" size="sm" className="w-full">
              Pregled
            </Button>
          </Link>
        </Card>
      </div>

      {/* Brze akcije */}
      <div className="bg-paper rounded-lg p-6 shadow-sm">
        <h2 className="text-heading font-bold mb-4">Brze akcije</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/admin/life-events/new">
            <Button variant="secondary" className="w-full">
              + Novi životni događaj
            </Button>
          </Link>
          <Link href="/admin/procedures/new">
            <Button variant="secondary" className="w-full">
              + Nova procedura
            </Button>
          </Link>
          <Link href="/admin/institutions/new">
            <Button variant="secondary" className="w-full">
              + Nova institucija
            </Button>
          </Link>
          <Link href="/admin/warnings">
            <Button variant="secondary" className="w-full">
              👀 Upozorenja
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}