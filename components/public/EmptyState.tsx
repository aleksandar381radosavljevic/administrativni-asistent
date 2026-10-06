// components/public/EmptyState.tsx
// Prikaz kada nema rezultata

import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({
  icon = '📋',
  title,
  description,
  ctaLabel,
  onCta,
}: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      {icon && <p className="text-6xl mb-4">{icon}</p>}
      <h2 className="text-heading mb-2">{title}</h2>
      <p className="text-body-sm text-ink-muted mb-6">{description}</p>
      {ctaLabel && onCta && (
        <Button onClick={onCta} variant="secondary" size="sm">
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}