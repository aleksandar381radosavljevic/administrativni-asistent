// app/(admin)/admin/procedures/[id]/edit/page.tsx
// Forma za izmenu procedure

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/clients';
import { ProcedureForm } from '@/components/admin/ProcedureForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/Alert';
import { ProcedureWrite } from '@/types/api';

interface Institution {
  id: string;
  name: string;
}

export default function EditProcedurePage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createSupabaseClient();

  const [procedure, setProcedure] = useState<ProcedureWrite | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [procRes, instRes] = await Promise.all([
          supabase
            .from('procedures')
            .select(
              `
              id, title, slug, description,
              can_online, can_in_person, can_by_mail,
              cost_amount, cost_description, processing_time,
              official_link, form_link, status, last_verified_at,
              steps(sort_order, title, description, link_url, link_label),
              documents(name, description, is_required, sort_order),
              procedure_institutions(institution_id)
              `
            )
            .eq('id', params.id)
            .single(),
          supabase.from('institutions').select('id, name').eq('status', 'published'),
        ]);

        if (procRes.error || !procRes.data) throw procRes.error;

        setProcedure({
          ...procRes.data,
          institution_ids: procRes.data.procedure_institutions?.map(
            (pi: { institution_id: string }) => pi.institution_id
          ) || [],
        });

        setInstitutions(instRes.data || []);
      } catch (err) {
        setError('Greška pri učitavanju procedure');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase, params.id]);

  const handleSubmit = async (formData: ProcedureWrite) => {
    setIsSaving(true);
    try {
      // Ažuriraj osnovne podatke procedure
      const { error: updateErr } = await supabase
        .from('procedures')
        .update({
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
        })
        .eq('id', params.id);

      if (updateErr) throw updateErr;

      // Obriši stare korake i kreiraj nove
      await supabase.from('steps').delete().eq('procedure_id', params.id);
      if (formData.steps && formData.steps.length > 0) {
        const stepsData = formData.steps.map((step) => ({
          procedure_id: params.id,
          ...step,
        }));
        const { error: stepsErr } = await supabase.from('steps').insert(stepsData);
        if (stepsErr) throw stepsErr;
      }

      // Obriši stara dokumenta i kreiraj nova
      await supabase.from('documents').delete().eq('procedure_id', params.id);
      if (formData.documents && formData.documents.length > 0) {
        const docsData = formData.documents.map((doc) => ({
          procedure_id: params.id,
          ...doc,
        }));
        const { error: docsErr } = await supabase.from('documents').insert(docsData);
        if (docsErr) throw docsErr;
      }

      // Obriši stare procedure_institutions i kreiraj nove
      await supabase.from('procedure_institutions').delete().eq('procedure_id', params.id);
      if (formData.institution_ids && formData.institution_ids.length > 0) {
        const instData = formData.institution_ids.map((inst_id) => ({
          procedure_id: params.id,
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
        <h1 className="text-title font-bold">Izmena procedure</h1>
        <p className="text-body-sm text-ink-muted">{procedure?.title || '...'}</p>
      </div>

      {error && <Alert type="error" title="Greška">{error}</Alert>}

      <div className="bg-paper rounded-lg p-6 shadow-sm">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-64" />
          </div>
        ) : procedure ? (
          <ProcedureForm
            initialData={procedure}
            institutions={institutions}
            onCancel={() => router.back()}
            onSubmit={handleSubmit}
            isLoading={isSaving}
          />
        ) : (
          <Alert type="error" title="Greška">Procedura nije pronađena</Alert>
        )}
      </div>
    </div>
  );
}