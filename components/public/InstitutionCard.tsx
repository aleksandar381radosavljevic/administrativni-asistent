// components/public/InstitutionCard.tsx
// Kartica sa institucijom

import { InstitutionSummary } from '@/types/api';
import { Phone, Mail, Globe, Clock } from 'lucide-react';

interface InstitutionCardProps {
  institution: InstitutionSummary;
}

export function InstitutionCard({ institution }: InstitutionCardProps) {
  return (
    <div className="card-base">
      <h3 className="text-heading font-bold mb-3">{institution.name}</h3>

      <div className="space-y-2 text-sm">
        {institution.working_hours && (
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-ink-muted flex-shrink-0 mt-0.5" />
            <span className="text-ink-muted">{institution.working_hours}</span>
          </div>
        )}

        {institution.phone && (
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-ink-muted flex-shrink-0 mt-0.5" />
            <a href={`tel:${institution.phone}`} className="text-amber hover:text-amber/80">
              {institution.phone}
            </a>
          </div>
        )}

        {institution.email && (
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-ink-muted flex-shrink-0 mt-0.5" />
            <a href={`mailto:${institution.email}`} className="text-amber hover:text-amber/80 text-xs break-all">
              {institution.email}
            </a>
          </div>
        )}

        {institution.website && (
          <div className="flex items-start gap-2">
            <Globe className="h-4 w-4 text-ink-muted flex-shrink-0 mt-0.5" />
            <a href={institution.website} target="_blank" rel="noopener noreferrer" className="text-amber hover:text-amber/80 text-xs break-all">
              {institution.website}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}