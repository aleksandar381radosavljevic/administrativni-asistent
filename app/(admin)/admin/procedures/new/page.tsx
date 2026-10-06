// app/(admin)/admin/procedures/new/page.tsx
// Forma za novu proceduru

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/clients';
import { ProcedureForm } from '@/components/admin/ProcedureForm';
import { Skeleton } from '@/components/ui/skeleton';
import { ProcedureWrite } from '@/types/api';

interface Institution {
  id: string;
  name: string;
}

export default function NewProcedurePage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: institutions } = await supabase
          .from('institutions')
          .select('id, name')
          .eq('status', 'published');

        setInstitutions(institutions || []);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const handleSubmit = async (formData: ProcedureWrite) => {
    setIsSaving(true);
    try {
      // Kreiraj proceduru
      const { data: procedure, error: procErr } = await supabase
        .from('procedures')
        .insert([
          {
            title: formData.title,
            slug: formData.slug,
            description: formData.description,
            can_online: formData.can_online,
            can_in_person: formData.can_in_person,
            can_by_mail: formData.can_by_mail,
            cost_amount: formData.cost_amount,
            cost_description: formData.cost_description,
            processing_time: formData.processing_time,
            official_link: formData.official_link,
            form_link: formData.form_link,
            status: formData.status,
            last_verified_at: formData.last_verified_at,
          },
        ])
        .select()
        .single();

      if (procErr || !procedure) throw procErr;

      // Kreiraj korake
      if (formData.steps && formData.steps.length > 0) {
        const stepsData = formData.steps.map((step) => ({
          procedure_id: procedure.id,
          ...step,
        }));
        const { error: stepsErr } = await supabase.from('steps').insert(stepsData);
        if (stepsErr) throw stepsErr;
      }

      // Kreiraj dokumenta
      if (formData.documents && formData.documents.length > 0) {
        const docsData = formData.documents.map((doc) => ({
          procedure_id: procedure.id,
          ...doc,
        }));
        const { error: docsErr } = await supabase.from('documents').insert(docsData);
        if (docsErr) throw docsErr;
      }

      // Kreiraj procedure_institutions veze
      if (formData.institution_ids && formData.institution_ids.length > 0) {
        const instData = formData.institution_ids.map((inst_id) => ({
          procedure_id: procedure.id,
          institution_id: inst_id,
        }));
        const { error: instErr } = await supabase
          .from('procedure_institutions')
          .insert(instData);
        if (instErr) throw instErr;
      }

      router.push('/admin/procedures');
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title font-bold">Nova procedura</h1>
        <p className="text-body-sm text-ink-muted">Kreiraj novu administrativnu proceduru</p>
      </div>

      <div className="bg-paper rounded-lg p-6 shadow-sm">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <ProcedureForm
            institutions={institutions}
            onCancel={() => router.back()}
            onSubmit={handleSubmit}
            isLoading={isSaving}
          />
        )}
      </div>
    </div>
  );
}