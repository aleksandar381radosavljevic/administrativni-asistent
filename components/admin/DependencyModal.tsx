// components/admin/DependencyModal.tsx
// Modal za izbor zavisnosti između procedura

import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Procedure {
  id: string;
  title: string;
  slug: string;
}

interface DependencyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allProcedures: Procedure[];
  currentProcedureId?: string;
  existingDependencies: string[];
  onAdd: (procedureSlug: string) => void;
}

export function DependencyModal({
  open,
  onOpenChange,
  allProcedures,
  currentProcedureId,
  existingDependencies,
  onAdd,
}: DependencyModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProcedures = allProcedures.filter(
    (proc) =>
      proc.id !== currentProcedureId &&
      !existingDependencies.includes(proc.slug) &&
      proc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasCircularDependency = () => {
    // Logika za detektovanje kružnih zavisnosti - trebalo bi biti u API-ju
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Dodaj zavisnost">
      <div className="space-y-4">
        <Input
          placeholder="Pretraži procedure..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredProcedures.length === 0 ? (
            <p className="text-center text-ink-muted text-sm py-4">
              Nema dostupnih procedura
            </p>
          ) : (
            filteredProcedures.map((proc) => (
              <div
                key={proc.id}
                className="flex items-center justify-between p-3 rounded-lg bg-cream"
              >
                <div>
                  <p className="text-body font-medium">{proc.title}</p>
                  {hasCircularDependency() && (
                    <div className="flex items-center gap-1 text-rust text-xs mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      Upozorenje: Moguća kružna zavisnost
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAdd(proc.slug)}
                  disabled={hasCircularDependency()}
                >
                  Dodaj
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t border-clay">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Zatvori
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
