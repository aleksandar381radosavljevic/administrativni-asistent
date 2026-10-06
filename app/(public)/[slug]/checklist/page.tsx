// app/(public)/[slug]/checklist/page.tsx
// Checklist za životni događaj - prati napredak sa localStorage

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useChecklist } from '@/lib/hooks/useChecklist';
import { ChecklistItem } from '@/components/public/ChecklistItem';
import { PhaseIndicator } from '@/components/public/PhaseIndicator';
import { ErrorState } from '@/components/public/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase/clients';

interface ProcedureInChecklist {
  id: string;
  title: string;
  slug: string;
  institution?: string;
}

interface LifeEventProcedureRow {
  procedure: ProcedureInChecklist[] | null;
  sort_order: number;
}

interface ProcedureDependencyRow {
  procedure_id: string;
  depends_on_id: string;
}

interface Phase {
  number: number;
  procedures: ProcedureInChecklist[];
  isActive: boolean;
}

export default function ChecklistPage() {
  const params = useParams();
  const supabase = createSupabaseClient();

  const [lifeEvent, setLifeEvent] = useState<{ id: string; title: string } | null>(null);
  const [procedures, setProcedures] = useState<ProcedureInChecklist[]>([]);
  const [dependencies, setDependencies] = useState<Map<string, Set<string>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { statuses, setStatus, getProgress, isLoading: isChecklistLoading } = useChecklist(
    lifeEvent?.id || ''
  );

  // Učitaj životni događaj i procedure
  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: eventData, error: eventErr } = await supabase
          .from('life_events')
          .select('id, title')
          .eq('slug', params.slug)
          .eq('status', 'published')
          .single();

        if (eventErr || !eventData) throw eventErr;
        setLifeEvent(eventData);

        // Učitaj procedure za ovaj događaj
        const { data: procData, error: procErr } = await supabase
          .from('life_event_procedures')
          .select(`
            procedure:procedures(id, title, slug),
            sort_order
          `)
          .eq('life_event_id', eventData.id)
          .order('sort_order');

        if (procErr) throw procErr;

        const procs = ((procData || []) as LifeEventProcedureRow[])
          .map((row) => row.procedure?.[0])
          .filter(
            (procedure): procedure is ProcedureInChecklist => procedure !== undefined
          );

        setProcedures(procs);

        // Učitaj zavisnosti
        const { data: depData, error: depErr } = await supabase
          .from('procedure_dependencies')
          .select('procedure_id, depends_on_id')
          .eq('life_event_id', eventData.id);

        if (depErr) throw depErr;

        const depMap = new Map<string, Set<string>>();
        (depData || []).forEach((dep: ProcedureDependencyRow) => {
          if (!depMap.has(dep.procedure_id)) {
            depMap.set(dep.procedure_id, new Set());
          }
          depMap.get(dep.procedure_id)!.add(dep.depends_on_id);
        });

        setDependencies(depMap);
      } catch (err) {
        setError('Greška pri učitavanju checkliste');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [supabase, params.slug]);

  // Organizuj procedure po fazama zavisnosti (topološko sortiranje)
  const phases: Phase[] = useMemo(() => {
    if (procedures.length === 0) return [];

    const depMap = dependencies;
    const visited = new Set<string>();
    const phases: Phase[] = [];
    let currentPhase = 0;

    // Kreni sa procedurama bez zavisnosti
    let currentLevel: string[] = procedures
      .filter((p) => !depMap.has(p.id) || depMap.get(p.id)!.size === 0)
      .map((p) => p.id);

    while (currentLevel.length > 0) {
      const phaseProcs = procedures.filter((p) => currentLevel.includes(p.id));
      const isActive = phaseProcs.some((p) => statuses.get(p.id) === 'done' || !visited.has(p.id));

      phases.push({
        number: currentPhase + 1,
        procedures: phaseProcs,
        isActive: isActive || currentPhase === 0, // Faza 1 je uvek aktivna
      });

      currentLevel.forEach((id) => visited.add(id));

      // Pronađi procedure čije su sve zavisnosti završene
      currentLevel = procedures
        .filter(
          (p) =>
            !visited.has(p.id) &&
            depMap.has(p.id) &&
            Array.from(depMap.get(p.id)!).every((dep) => visited.has(dep))
        )
        .map((p) => p.id);

      currentPhase++;
    }

    return phases;
  }, [procedures, dependencies, statuses]);

  const { completed, percentage } = getProgress(procedures.length);

  if (isLoading || isChecklistLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !lifeEvent) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <ErrorState
          title="Checklist nije pronađen"
          description={error || 'Životni događaj nije pronađen.'}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Back button */}
      <Link href={`/${lifeEvent.id}`} className="inline-flex items-center gap-2 text-amber hover:text-amber/80">
        ← {lifeEvent.title}
      </Link>

      <div>
        <h1 className="text-title font-bold">Checklist</h1>
        <p className="text-body-sm text-ink-muted">Prati svoj napredak kroz procedure</p>
      </div>

      {/* Progress bar */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 h-2 rounded-full bg-clay overflow-hidden mr-4">
            <div
              className="h-full bg-amber rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-data text-ink-muted whitespace-nowrap">
            {completed} / {procedures.length} završeno
          </span>
        </div>
      </Card>

      {/* Info baner */}
      <Alert type="info" title="Lokalno čuvanje">
        📱 Napredak se čuva lokalno u vašem pretraživaču i nije sinhronizovan između uređaja.
      </Alert>

      {/* Procedure po fazama */}
      {phases.map((phase, idx) => (
        <div key={idx} className="space-y-4">
          <PhaseIndicator phase={phase.number} isActive={phase.isActive} />

          <div className="space-y-2">
            {phase.procedures.map((proc) => {
              const status = statuses.get(proc.id) || 'todo';
              const procDeps = dependencies.get(proc.id) || new Set();
              const allDepsComplete = Array.from(procDeps).every(
                (depId) => statuses.get(depId) === 'done'
              );
              const isBlocked = !allDepsComplete && status === 'todo';

              // Pronađi naziv zavisne procedure za prikaz
              const blockedReasonIds = Array.from(procDeps).filter(
                (depId) => statuses.get(depId) !== 'done'
              );
              const blockedReason =
                blockedReasonIds.length > 0
                  ? procedures
                      .filter((p) => blockedReasonIds.includes(p.id))
                      .map((p) => p.title)
                      .join(', ')
                  : undefined;

              return (
                <ChecklistItem
                  key={proc.id}
                  title={proc.title}
                  status={status}
                  isBlocked={isBlocked}
                  blockedReason={blockedReason}
                  onStatusChange={(newStatus) => setStatus(proc.id, newStatus)}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Info o sinhronizaciji */}
      <Alert type="info">
        <p className="text-body-sm">
          Ako otvoriš checklist na drugom uređaju, napredak neće biti sinhronizovan. Koristi isti
          uređaj da nastaviš tamo gde si stao.
        </p>
      </Alert>
    </div>
  );
}
