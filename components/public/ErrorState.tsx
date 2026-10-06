// components/public/ErrorState.tsx
// Prikaz greške sa retry opcijom

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <div className="py-12 text-center">
      <AlertTriangle className="h-12 w-12 text-rust mx-auto mb-4" />
      <h2 className="text-heading mb-2 text-rust">{title}</h2>
      <p className="text-body-sm text-ink-muted mb-6">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm">
          Pokušaj ponovo
        </Button>
      )}
    </div>
  );
}