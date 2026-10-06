// app/(admin)/admin/life-events/[id]/edit/page.tsx
// Forma za izmenu životnog događaja

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/clients';
import { LifeEventForm } from '@/components/admin/LifeEventForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/Alert';
import { ContentStatus } from '@/types/api';
import type { LifeEventWrite } from '@/types/api';

interface Category {
  id: string;
  name: string;
}

interface LifeEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  category_id: string;
  status?: ContentStatus;
}

export default function EditLifeEventPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createSupabaseClient();

  const [lifeEvent, setLifeEvent] = useState<LifeEvent | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, categoriesRes] = await Promise.all([
          supabase
            .from('life_events')
            .select('*')
            .eq('id', params.id)
            .single(),
          supabase
            .from('categories')
            .select('id, name')
            .order('sort_order'),
        ]);

        if (eventRes.error) throw eventRes.error;
        setLifeEvent(eventRes.data);
        setCategories(categoriesRes.data || []);
      } catch (err) {
        setError('Greška pri učitavanju');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase, params.id]);

  const handleSubmit = async (formData: LifeEventWrite) => {
    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('life_events')
        .update(formData)
        .eq('id', params.id);

      if (updateError) throw updateError;

      router.push('/admin/life-events');
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title font-bold">Izmena životnog događaja</h1>
        <p className="text-body-sm text-ink-muted">
          {lifeEvent?.title || '...'}
        </p>
      </div>

      {error && <Alert type="error" title="Greška">{error}</Alert>}

      <div className="bg-paper rounded-lg p-6 shadow-sm">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-24" />
          </div>
        ) : lifeEvent ? (
          <LifeEventForm
            initialData={lifeEvent}
            categories={categories}
            onSubmit={handleSubmit}
            isLoading={isSaving}
          />
        ) : (
          <Alert type="error" title="Greška">Životni događaj nije pronađen</Alert>
        )}
      </div>
    </div>
  );
}
