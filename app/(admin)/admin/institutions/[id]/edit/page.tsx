// app/(admin)/admin/institutions/[id]/edit/page.tsx
// Forma za izmenu institucije

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/clients';
import { InstitutionForm } from '@/components/admin/InstitutionForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/Alert';
import { InstitutionWrite } from '@/types/api';

interface Institution extends InstitutionWrite {
  id: string;
}

export default function EditInstitutionPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createSupabaseClient();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstitution = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('institutions')
          .select('*')
          .eq('id', params.id)
          .single();

        if (fetchError) throw fetchError;
        setInstitution(data);
      } catch (err) {
        setError('Institucija nije pronađena ili greška pri učitavanju.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstitution();
  }, [supabase, params.id]);

  const handleSubmit = async (formData: InstitutionWrite) => {
    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('institutions')
        .update(formData)
        .eq('id', params.id);

      if (updateError) throw updateError;

      router.push('/admin/institutions');
      router.refresh();
    } catch (err) {
      setError('Greška pri čuvanju izmena.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title font-bold">Izmena institucije</h1>
        <p className="text-body-sm text-ink-muted">{institution?.name || '...'}</p>
      </div>

      {error && <Alert type="error" title="Greška">{error}</Alert>}

      <div className="bg-paper rounded-lg p-6 shadow-sm">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-24" />
          </div>
        ) : institution ? (
          <InstitutionForm
            initialData={institution}
            onSubmit={handleSubmit}
            isLoading={isSaving}
          />
        ) : (
          !error && <Alert type="error" title="Greška">Institucija nije pronađena</Alert>
        )}
      </div>
    </div>
  );
}
