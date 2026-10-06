// app/(admin)/admin/institutions/page.tsx
// Lista institucija

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

interface Institution {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
}

export default function InstitutionsListPage() {
  const supabase = createSupabaseClient();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const { data, error: err } = await supabase
          .from('institutions')
          .select('id, name, website, phone, status, created_at')
          .order('name', { ascending: true });

        if (err) throw err;
        setInstitutions(data || []);
      } catch (err) {
        setError('Greška pri učitavanju institucija');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstitutions();
  }, [supabase]);

  const handleDelete = async (id: string) => {
    if (!confirm('Sigurno želiš da arhiviraš ovu instituciju?')) return;

    try {
      const { error: archiveError } = await supabase
        .from('institutions')
        .update({ status: 'archived' })
        .eq('id', id);

      if (archiveError) throw archiveError;

      setInstitutions(institutions.filter((i) => i.id !== id));
    } catch (err) {
      setError('Greška pri arhiviranju institucije');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title font-bold">Institucije</h1>
          <p className="text-body-sm text-ink-muted">
            Upravljanje državnim institucijama
          </p>
        </div>
        <Link href="/admin/institutions/new">
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
          <AdminDataTable<Institution>
            data={institutions}
            columns={[
              { key: 'name', label: 'Naziv' },
              {
                key: 'phone',
                label: 'Telefon',
                render: (phone) => phone || <span className="text-ink-muted">—</span>,
              },
              {
                key: 'website',
                label: 'Sajt',
                render: (website) =>
                  website ? (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber hover:text-amber/80"
                    >
                      {website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  ),
              },
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
            ]}
            editLink={(id) => `/admin/institutions/${id}/edit`}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}