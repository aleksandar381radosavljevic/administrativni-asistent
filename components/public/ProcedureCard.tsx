// components/public/ProcedureCard.tsx
// Kartica sa procedurom

import { ProcedureSummary } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils/api';

interface ProcedureCardProps {
  procedure: ProcedureSummary;
  isBlocked?: boolean;
}

export function ProcedureCard({ procedure, isBlocked = false }: ProcedureCardProps) {
  return (
    <div
      className={`card-base ${
        isBlocked ? 'opacity-60 border-dashed border-2 border-clay-dark' : ''
      }`}
    >
      <div className="mb-3">
        <p className="text-body font-bold">{procedure.title}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Metode */}
        {procedure.can_online && <Badge variant="online">Online</Badge>}
        {procedure.can_in_person && <Badge variant="in-person">Lično</Badge>}
        {procedure.can_by_mail && <Badge variant="by-mail">Poštom</Badge>}

        {/* Cena */}
        <Badge variant="optional" className="ml-auto">
          💰 {formatPrice(procedure.cost_amount)}
        </Badge>

        {/* Vreme */}
        {procedure.processing_time && (
          <Badge variant="optional">⏱ {procedure.processing_time}</Badge>
        )}
      </div>

      {procedure.is_stale && (
        <p className="mt-3 text-xs text-rust">
          ⚠️ Poslednja provera: {procedure.last_verified_at ? new Date(procedure.last_verified_at).toLocaleDateString('sr-RS') : 'Nepoznato'}
        </p>
      )}
    </div>
  );
}