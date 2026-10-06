// app/(public)/procedure/[slug]/page.tsx
// Detalji procedure - sve što korisnik treba

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/clients';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/public/ErrorState';
import { StepCard } from '@/components/public/StepCard';
import { InstitutionCard } from '@/components/public/InstitutionCard';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Step {
  sort_order: number;
  title: string;
  description: string;
  link_url?: string;
  link_label?: string;
}

interface Document {
  name: string;
  description?: string;
  is_required: boolean;
  sort_order: number;
}

interface Institution {
  id: string;
  name: string;
  slug: string;
  status: 'published';
  website?: string;
  phone?: string;
  email?: string;
  working_hours?: string;
}

interface ProcedureDetail {
  id: string;
  title: string;
  description?: string;
  can_online: boolean;
  can_in_person: boolean;
  can_by_mail: boolean;
  cost_amount?: number;
  processing_time?: string;
  official_link?: string;
  form_link?: string;
  last_verified_at?: string;
  steps: Step[];
  documents: Document[];
  institutions: Institution[];
}

export default function ProcedureDetailPage() {
  const params = useParams();
  const supabase = createSupabaseClient();

  const [procedure, setProcedure] = useState<ProcedureDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const fetchProcedure = async () => {
      try {
        const { data, error: err } = await supabase
          .from('procedures')
          .select(
            `
            id, title, description, 
            can_online, can_in_person, can_by_mail,
            cost_amount, processing_time,
            official_link, form_link,
            last_verified_at,
            steps(sort_order, title, description, link_url, link_label),
            documents(name, description, is_required, sort_order),
            procedure_institutions(institution:institutions(id, name, slug, status, website, phone, email, working_hours))
            `
          )
          .eq('slug', params.slug)
          .eq('status', 'published')
          .single();

        if (err || !data) throw err || new Error('Procedura nije pronađena');

        // Prosledi institutions iz junction tabele
        const institutions: Institution[] = [];
        (data.procedure_institutions || []).forEach((relation) => {
          const institution = relation.institution?.[0];
          if (institution) {
            institutions.push({
              id: institution.id,
              name: institution.name,
              slug: institution.slug,
              status: 'published',
              website: institution.website ?? undefined,
              phone: institution.phone ?? undefined,
              email: institution.email ?? undefined,
              working_hours: institution.working_hours ?? undefined,
            });
          }
        });
        const procedures = { ...data, institutions };

        setProcedure(procedures);

        // Proveri da li je zastarela (>6 meseci bez provere)
        if (data.last_verified_at) {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          setIsStale(new Date(data.last_verified_at) < sixMonthsAgo);
        }
      } catch (err) {
        setError('Procedura nije pronađena ili greška pri učitavanju.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProcedure();
  }, [supabase, params.slug]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !procedure) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <ErrorState
          title="Procedura nije pronađena"
          description={error || 'Procedura koju ste tražili ne postoji ili je nedostupna.'}
        />
      </div>
    );
  }

  const formatPrice = (amount?: number) => {
    if (!amount) return 'Besplatno';
    return amount.toLocaleString('sr-RS', { style: 'currency', currency: 'RSD' });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Back button */}
      <Link href="/" className="inline-flex items-center gap-2 text-amber hover:text-amber/80">
        ← Početna
      </Link>

      {/* Upozorenje ako je zastarela */}
      {isStale && procedure.last_verified_at && (
        <Alert type="warning" title="Zastarela informacija">
          Ova procedura nije proverena od{' '}
          {new Date(procedure.last_verified_at).toLocaleDateString('sr-RS')}. Preporučujemo da
          proverite zvanični izvor pre nego što započnete proceduru.
        </Alert>
      )}

      {/* Naslov i meta informacije */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-ink">{procedure.title}</h1>

        {procedure.institutions.length > 0 && (
          <p className="text-body-sm text-ink-muted">
            Institucija: {procedure.institutions.map((i) => i.name).join(', ')}
          </p>
        )}

        {/* Metapodaci - metode, cena, vreme */}
        <div className="flex flex-wrap gap-2">
          {procedure.can_online && <Badge variant="online">Online</Badge>}
          {procedure.can_in_person && <Badge variant="in-person">Lično</Badge>}
          {procedure.can_by_mail && <Badge variant="by-mail">Poštom</Badge>}

          {procedure.cost_amount !== null && (
            <Badge variant="optional">💰 {formatPrice(procedure.cost_amount)}</Badge>
          )}

          {procedure.processing_time && (
            <Badge variant="optional">⏱ {procedure.processing_time}</Badge>
          )}
        </div>
      </div>

      {/* Opis */}
      {procedure.description && (
        <div className="bg-paper rounded-lg p-6 shadow-sm">
          <p className="text-body-sm text-ink-muted leading-relaxed">{procedure.description}</p>
        </div>
      )}

      {/* Koraci */}
      {procedure.steps && procedure.steps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-heading font-bold uppercase text-amber">Koraci</h2>
          <div className="space-y-3">
            {procedure.steps
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((step) => (
                <StepCard key={step.sort_order} step={step} />
              ))}
          </div>
        </div>
      )}

      {/* Potrebna dokumenta */}
      {procedure.documents && procedure.documents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-heading font-bold uppercase text-amber">Potrebna Dokumenta</h2>
          <div className="bg-paper rounded-lg divide-y divide-clay">
            {procedure.documents
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((doc, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 mt-0.5 ${
                      doc.is_required
                        ? 'border-amber bg-amber/10'
                        : 'border-clay-dark bg-clay/10'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-body font-semibold text-ink">{doc.name}</p>
                    {doc.description && (
                      <p className="text-body-sm text-ink-muted mt-1">{doc.description}</p>
                    )}
                  </div>
                  <Badge variant={doc.is_required ? 'required' : 'optional'}>
                    {doc.is_required ? 'Obavezno' : 'Opciono'}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Institucije */}
      {procedure.institutions && procedure.institutions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-heading font-bold uppercase text-amber">Institucija</h2>
          <div className="space-y-3">
            {procedure.institutions.map((inst) => (
              <InstitutionCard key={inst.id} institution={inst} />
            ))}
          </div>
        </div>
      )}

      {/* Zvanični linkovi */}
      {(procedure.official_link || procedure.form_link) && (
        <div className="space-y-4">
          <h2 className="text-heading font-bold uppercase text-amber">Važni Linkovi</h2>
          <div className="space-y-2">
            {procedure.official_link && (
              <a
                href={procedure.official_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-amber hover:text-amber/80 font-semibold focus-ring rounded px-2 py-1"
              >
                Zvanični sajt
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {procedure.form_link && (
              <a
                href={procedure.form_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-amber hover:text-amber/80 font-semibold focus-ring rounded px-2 py-1"
              >
                Preuzmi formular
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
