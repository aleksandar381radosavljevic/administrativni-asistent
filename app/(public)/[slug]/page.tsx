// app/(public)/[slug]/page.tsx
// Detalji životnog događaja sa procedurama i zavisnostima
// Usklađenost: UF-01, UF-04, sekcija 3 iz 08-screen-specifications.md

import { createSupabaseClient } from '@/lib/supabase/clients';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PhaseIndicator } from '@/components/public/PhaseIndicator';
import { ProcedureCard } from '@/components/public/ProcedureCard';
import { Button } from '@/components/ui/button';
import type { ContentStatus, ProcedureSummary } from '@/types/api';

export const revalidate = 3600; // ISR

interface PageProps {
  params: {
    slug: string;
  };
}

interface LifeEventPageData {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  slug: string;
  status: ContentStatus;
  category: { id: string; name: string; slug: string } | null;
  procedures: Array<{ procedure: ProcedureSummary | null }>;
  dependencies: Array<{ procedure_id: string; depends_on_id: string }>;
}

async function getLifeEvent(slug: string): Promise<LifeEventPageData | null> {
  const supabase = createSupabaseClient();

  try {
    // Preuzmite životni događaj sa procedurama
    const { data: lifeEvent, error: eventError } = await supabase
      .from('life_events')
      .select(
        `
        id,
        title,
        description,
        icon,
        slug,
        status,
        category:categories(id, name, slug),
        procedures:life_event_procedures(
          procedure:procedures(
            id, title, description, slug, can_online, can_in_person, can_by_mail,
            cost_amount, processing_time, status, last_verified_at
          )
        )
      `
      )
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (eventError || !lifeEvent) {
      return null;
    }

    // Preuzmite zavisnosti
    const { data: dependencies } = await supabase
      .from('procedure_dependencies')
      .select('procedure_id, depends_on_id')
      .eq('life_event_id', lifeEvent.id);

    return {
      id: lifeEvent.id,
      title: lifeEvent.title,
      description: lifeEvent.description,
      icon: lifeEvent.icon,
      slug: lifeEvent.slug,
      status: lifeEvent.status,
      category: lifeEvent.category?.[0] ?? null,
      procedures: (lifeEvent.procedures || []).map(
        (eventProcedure: { procedure: ProcedureSummary[] | null }) => ({
        procedure: eventProcedure.procedure?.[0] ?? null,
        })
      ),
      dependencies: dependencies || [],
    };
  } catch (error) {
    console.error('Error fetching life event:', error);
    return null;
  }
}

/**
 * Topološko sortiranje procedura u faze
 * Faza 1: Procedure bez zavisnosti
 * Faza N: Procedure čije zavisnosti su u fazama < N
 */
function organizePhasesFromDependencies(
  procedures: ProcedureSummary[],
  dependencies: Array<{ procedure_id: string; depends_on_id: string }>
): Array<{ phase: number; procedures: ProcedureSummary[] }> {
  // Build dependency graph
  const dependencyMap = new Map<string, string[]>();
  procedures.forEach((proc) => {
    dependencyMap.set(proc.id, []);
  });

  dependencies.forEach((dep) => {
    if (dependencyMap.has(dep.procedure_id)) {
      dependencyMap.get(dep.procedure_id)!.push(dep.depends_on_id);
    }
  });

  // Assign phases
  const phases = new Map<string, number>();
  let changed = true;
  while (changed) {
    changed = false;
    procedures.forEach((proc) => {
      if (phases.has(proc.id)) return;

      const deps = dependencyMap.get(proc.id) || [];
      if (deps.length === 0) {
        phases.set(proc.id, 1);
        changed = true;
      } else {
        const maxDependencyPhase = Math.max(
          ...deps
            .map((depId) => phases.get(depId) || 0)
            .filter((p) => p > 0)
        );

        if (maxDependencyPhase > 0) {
          phases.set(proc.id, maxDependencyPhase + 1);
          changed = true;
        }
      }
    });
  }

  // Group by phase
  const phaseGroups = new Map<number, ProcedureSummary[]>();
  procedures.forEach((proc) => {
    const phase = phases.get(proc.id) || 1;
    if (!phaseGroups.has(phase)) {
      phaseGroups.set(phase, []);
    }
    phaseGroups.get(phase)!.push(proc);
  });

  // Convert to array
  return Array.from(phaseGroups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([phase, procs]) => ({
      phase,
      procedures: procs,
    }));
}

export default async function LifeEventPage({ params }: PageProps) {
  const lifeEvent = await getLifeEvent(params.slug);

  if (!lifeEvent) {
    notFound();
  }

  // Ekstraktuj procedure iz rezultata
  const procedures = (lifeEvent.procedures || [])
    .map((eventProcedure) => eventProcedure.procedure)
    .filter((procedure): procedure is ProcedureSummary => procedure !== null);

  // Organizuj procedure u faze
  const phases = organizePhasesFromDependencies(
    procedures,
    lifeEvent.dependencies || []
  );

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-[420px] px-4 py-6 md:max-w-2xl md:px-6 lg:max-w-4xl">
        {/* Back Navigation */}
        <div className="mb-6 text-caption text-ink-muted">
          <Link href="/" className="hover:text-ink focus-ring rounded">
            ← {lifeEvent.category?.name || 'Početna'}
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6">
          {lifeEvent.icon && (
            <div className="mb-4 inline-block rounded-md bg-amber-soft p-3 text-4xl">
              {lifeEvent.icon}
            </div>
          )}
          <h1 className="text-display mb-2">{lifeEvent.title}</h1>
          {lifeEvent.description && (
            <p className="text-body-sm mb-4 text-ink-muted">
              {lifeEvent.description}
            </p>
          )}
        </div>

        {/* Meta Info */}
        <div className="mb-6 flex gap-4 rounded-lg bg-paper px-4 py-3 font-mono text-sm text-ink">
          <span>📋 {procedures.length} procedure</span>
          <span>⏱ ~2 nedelje</span>
        </div>

        {/* Checklist Button */}
        <div className="mb-8">
          <Link href={`/${params.slug}/checklist`}>
            <Button className="w-full">Otvori checklist</Button>
          </Link>
        </div>

        {/* Phases with Procedures */}
        {phases.map((phaseGroup) => (
          <div key={phaseGroup.phase}>
            <PhaseIndicator phase={phaseGroup.phase} />

            <div className="mb-8 space-y-3 pl-6">
              {phaseGroup.procedures.map((proc) => (
                <Link
                  key={proc.id}
                  href={`/procedure/${proc.slug}`}
                  className="block focus-ring rounded-lg"
                >
                  <ProcedureCard procedure={proc} />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Footer Spacing */}
        <div className="h-12" />
      </div>
    </main>
  );
}
