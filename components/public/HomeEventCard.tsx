// components/public/HomeEventCard.tsx
// Red sa životnim događajem na početnoj stranici

import { LifeEventSummary } from '@/types/api';
import { ChevronRight } from 'lucide-react';

interface HomeEventCardProps {
  event: LifeEventSummary;
}

export function HomeEventCard({ event }: HomeEventCardProps) {
  return (
    <div className="card-base flex items-center gap-4">
      {event.icon && (
        <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-md bg-amber-soft text-lg">
          {event.icon}
        </div>
      )}
      <div className="flex-1">
        <p className="text-body font-bold">{event.title}</p>
        <p className="text-data text-ink-muted">
          {event.category?.name || 'Kategorija'}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-ink-muted flex-shrink-0" />
    </div>
  );
}