// app/(admin)/admin/life-events/new/page.tsx
// Forma za novi životni događaj

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/clients';
import { LifeEventForm } from '@/components/admin/LifeEventForm';
import { Skeleton } from '@/components/ui/skeleton';
import type { LifeEventWrite } from '@/types/api';

interface Category {
  id: string;
  name: string;
}

export default function NewLifeEventPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await supabase
          .from('categories')
          .select('id, name')
          .order('sort_order');

        setCategories(data || []);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [supabase]);

  const handleSubmit = async (formData: LifeEventWrite) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('life_events')
        .insert([formData]);

      if (error) throw error;

      router.push('/admin/life-events');
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title font-bold">Novi životni događaj</h1>
        <p className="text-body-sm text-ink-muted">Kreiraj novi životni događaj</p>
      </div>

      <div className="bg-paper rounded-lg p-6 shadow-sm">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <LifeEventForm
            categories={categories}
            onSubmit={handleSubmit}
            isLoading={isSaving}
          />
        )}
      </div>
    </div>
  );
}