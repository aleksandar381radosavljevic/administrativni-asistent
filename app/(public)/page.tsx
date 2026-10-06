// app/(public)/page.tsx
// Početna stranica - lista životnih događaja po kategorijama
// Usklađenost: UF-01, sekcija 5.1 iz 00-product-spec.md

import { createSupabaseClient } from '@/lib/supabase/clients';
import { SearchBar } from '@/components/public/SearchBar';
import { HomeEventCard } from '@/components/public/HomeEventCard';
import { EmptyState } from '@/components/public/EmptyState';
import Link from 'next/link';
import { ContentStatus } from '@/types/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface LifeEvent {
  id: string;
  title: string;
  slug: string;
  icon?: string;
  category_id: string;
  status: ContentStatus;
}

interface CategoryWithEvents extends Category {
  events: LifeEvent[];
}

export const revalidate = 3600; // ISR - revalidate svakih sat vremena

async function getHomeData(): Promise<CategoryWithEvents[]> {
  const supabase = createSupabaseClient();

  try {
    // Preuzmite sve kategorije
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (categoriesError) throw categoriesError;

    // Preuzmite sve objavljene životne događaje
    const { data: lifeEvents, error: eventsError } = await supabase
      .from('life_events')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true });

    if (eventsError) throw eventsError;

    // Grupiraj događaje po kategorijama
    const categoriesWithEvents: CategoryWithEvents[] = (categories || []).map(
      (cat: Category) => ({
        ...cat,
        events: (lifeEvents || []).filter(
          (event: LifeEvent) => event.category_id === cat.id
        ),
      })
    );

    // Filtriraš samo kategorije koje imaju događaje
    return categoriesWithEvents.filter((cat) => cat.events.length > 0);
  } catch (error) {
    console.error('Error fetching home data:', error);
    return [];
  }
}

export default async function HomePage() {
  const categoriesWithEvents = await getHomeData();

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-[420px] px-4 py-6 md:max-w-2xl md:px-6 lg:max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <p className="text-eyebrow text-amber mb-2">Dobar dan 👋</p>
          <h1 className="text-display mb-4">Šta ti se dešava?</h1>

          {/* Search Bar */}
          <SearchBar />
        </div>

        {/* Error State */}
        {categoriesWithEvents.length === 0 && (
          <EmptyState
            icon="📋"
            title="Nema dostupnih procedura"
            description="Procedura nisu dostupne u ovom trenutku. Pokušajte ponovo kasnije."
          />
        )}

        {/* Categories with Events */}
        {categoriesWithEvents.map((category) => (
          <section key={category.id} className="mb-8">
            <h2 className="section-label mb-4">{category.name}</h2>

            <div className="space-y-3">
              {category.events.map((event: LifeEvent) => (
                <Link
                  key={event.id}
                  href={`/${event.slug}`}
                  className="block focus-ring rounded-lg"
                >
                  <HomeEventCard event={event} />
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Footer Spacing */}
        <div className="h-12" />
      </div>
    </main>
  );
}
