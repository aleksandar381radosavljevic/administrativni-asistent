// components/public/StepCard.tsx
// Numerisani korak procedure

import { ExternalLink } from 'lucide-react';

interface StepCardProps {
  step: {
    sort_order: number;
    title: string;
    description: string;
    link_url?: string;
    link_label?: string;
  };
}

export function StepCard({ step }: StepCardProps) {
  return (
    <div className="card-base flex gap-4">
      {/* Broj koraka */}
      <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-soft font-bold text-amber">
        {step.sort_order}
      </div>

      {/* Sadržaj */}
      <div className="flex-1">
        <p className="text-body font-bold mb-1">{step.title}</p>
        <p className="text-body-sm text-ink-muted mb-2">{step.description}</p>

        {step.link_url && (
          <a
            href={step.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption text-amber hover:text-amber/80 flex items-center gap-1 focus-ring rounded"
          >
            {step.link_label || 'Otvori link'}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}