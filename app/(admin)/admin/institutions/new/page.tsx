// app/(admin)/admin/institutions/new/page.tsx
// Forma za novu instituciju

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/clients';
import { InstitutionForm } from '@/components/admin/InstitutionForm';
import { Alert } from '@/components/ui/Alert';
import { InstitutionWrite } from '@/types/api';
import { generateSlug } from '@/lib/utils/api';

export default function NewInstitutionPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: InstitutionWrite) => {
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        slug: formData.slug || generateSlug(formData.name),
      };

      const { error: insertError } = await supabase
        .from('institutions')
        .insert([payload]);

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Institucija sa ovim nazivom (slug-om) već postoji.');
        } else {
          setError('Greška pri čuvanju institucije.');
        }
        return;
      }

      router.push('/admin/institutions');
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title font-bold">Nova institucija</h1>
        <p className="text-body-sm text-ink-muted">Dodaj novu državnu instituciju</p>
      </div>

      {error && <Alert type="error" title="Greška">{error}</Alert>}

      <div className="bg-paper rounded-lg p-6 shadow-sm">
        <InstitutionForm onSubmit={handleSubmit} isLoading={isSaving} />
      </div>
    </div>
  );
}