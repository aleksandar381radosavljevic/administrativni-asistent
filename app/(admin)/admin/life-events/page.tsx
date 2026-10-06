// app/(admin)/admin/life-events/page.tsx
// Lista životnih događaja

'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/clients';
import { Button } from '@/components/ui/button';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/Alert';
import { Plus } from 'lucide-react';
import Link from 'next/link';

interface LifeEvent {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
}

export default function LifeEventsListPage() {
  const supabase = createSupabaseClient();
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLifeEvents = async () => {
      try {
        const { data, error: err } = await supabase
          .from('life_events')
          .select('id, title, status, created_at')
          .order('created_at', { ascending: false });

        if (err) throw err;
        setLifeEvents(data || []);
      } catch (err) {
        setError('Greška pri učitavanju životnih događaja');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLifeEvents();
  }, [supabase]);

  const handleDelete = async (id: string) => {
    if (!confirm('Sigurno želiš da arhiviraš ovaj događaj?')) return;

    try {
      await supabase
        .from('life_events')
        .update({ status: 'archived' })
        .eq('id', id);

      setLifeEvents(lifeEvents.filter((e) => e.id !== id));
    } catch (err) {
      setError('Greška pri arhiviranju');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title font-bold">Životni događaji</h1>
          <p className="text-body-sm text-ink-muted">Upravljanje životnim događajima</p>
        </div>
        <Link href="/admin/life-events/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj novo
          </Button>
        </Link>
      </div>

      {error && <Alert type="error" title="Greška">{error}</Alert>}

      {/* Tabela */}
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="bg-paper rounded-lg shadow-sm">
          <AdminDataTable<LifeEvent>
            data={lifeEvents}
            columns={[
              { key: 'title', label: 'Naziv' },
              {
                key: 'status',
                label: 'Status',
                render: (status) => (
                  <Badge
                    variant={
                      status === 'published'
                        ? 'success'
                        : status === 'draft'
                        ? 'warning'
                        : 'optional'
                    }
                  >
                    {status === 'published'
                      ? 'Objavljeno'
                      : status === 'draft'
                      ? 'Nacrt'
                      : 'Arhivirano'}
                  </Badge>
                ),
              },
              {
                key: 'created_at',
                label: 'Kreirano',
                render: (date) => new Date(date).toLocaleDateString('sr-RS'),
              },
            ]}
            editLink={(id) => `/admin/life-events/${id}/edit`}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}