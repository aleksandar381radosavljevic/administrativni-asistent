// app/(admin)/admin/procedures/page.tsx
// Lista procedura

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

interface Procedure {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  last_verified_at: string | null;
  is_stale: boolean;
  created_at: string;
}

export default function ProceduresListPage() {
  const supabase = createSupabaseClient();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        const { data, error: err } = await supabase
          .from('procedures')
          .select('id, title, status, last_verified_at, created_at')
          .order('created_at', { ascending: false });

        if (err) throw err;

        // Izračunaj is_stale na nivou aplikacije (nije kolona u bazi)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const withStale = (data || []).map((proc) => ({
          ...proc,
          is_stale: !proc.last_verified_at || new Date(proc.last_verified_at) < sixMonthsAgo,
        }));

        setProcedures(withStale);
      } catch (err) {
        setError('Greška pri učitavanju procedura');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProcedures();
  }, [supabase]);

  const handleDelete = async (id: string) => {
    if (!confirm('Sigurno želiš da arhiviraš ovu proceduru?')) return;

    try {
      await supabase
        .from('procedures')
        .update({ status: 'archived' })
        .eq('id', id);

      setProcedures(procedures.filter((p) => p.id !== id));
    } catch (err) {
      setError('Greška pri arhiviranju');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title font-bold">Procedure</h1>
          <p className="text-body-sm text-ink-muted">Upravljanje administrativnim procedurama</p>
        </div>
        <Link href="/admin/procedures/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj novu
          </Button>
        </Link>
      </div>

      {error && <Alert type="error" title="Greška">{error}</Alert>}

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="bg-paper rounded-lg shadow-sm">
          <AdminDataTable<Procedure>
            data={procedures}
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
                    {status === 'published' ? 'Objavljeno' : status === 'draft' ? 'Nacrt' : 'Arhivirano'}
                  </Badge>
                ),
              },
              {
                key: 'is_stale',
                label: 'Zastarelo?',
                render: (isStale) => (
                  isStale ? (
                    <Badge variant="error">⚠️ Zastarelo</Badge>
                  ) : (
                    <Badge variant="success">✓ Ažurno</Badge>
                  )
                ),
              },
            ]}
            editLink={(id) => `/admin/procedures/${id}/edit`}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
