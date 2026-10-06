// components/public/ChecklistItem.tsx
// Stavka u checklisti sa statusom

import { Badge } from '@/components/ui/badge';

type ChecklistStatus = 'todo' | 'in-progress' | 'done';

interface ChecklistItemProps {
  title: string;
  institution?: string;
  status: ChecklistStatus;
  isBlocked?: boolean;
  blockedReason?: string;
  onStatusChange?: (newStatus: ChecklistStatus) => void;
}

export function ChecklistItem({
  title,
  institution,
  status,
  isBlocked = false,
  blockedReason,
  onStatusChange,
}: ChecklistItemProps) {
  const cycle: Record<ChecklistStatus, ChecklistStatus> = {
    todo: 'in-progress',
    'in-progress': 'done',
    done: 'todo',
  };

  // ES-04: blokirana procedura se vizuelno ističe, ali NEMA tehničku blokadu –
  // tap mora raditi. Vizuelni "blocked" prikaz se gasi čim korisnik pomeri status
  // sa "todo" (svesno je nastavio uprkos upozorenju).
  const showBlockedVisual = isBlocked && status === 'todo';

  const handleToggle = () => {
    onStatusChange?.(cycle[status]);
  };

  return (
    <div
      className={`card-base flex items-center gap-3 ${
        showBlockedVisual ? 'opacity-60 border-2 border-dashed border-clay-dark shadow-none' : ''
      }`}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex-shrink-0 focus-ring rounded-full"
        aria-label="Promeni status procedure"
      >
        {showBlockedVisual ? (
          <span className="flex h-6 w-6 items-center justify-center text-base">🔒</span>
        ) : status === 'done' ? (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sage text-white text-sm">
            ✓
          </div>
        ) : status === 'in-progress' ? (
          <div className="h-6 w-6 rounded-full border-4 border-honey bg-honey/30" />
        ) : (
          <div className="h-6 w-6 rounded-full border-2 border-clay-dark" />
        )}
      </button>

      <div className="flex-1">
        <p className="text-body font-bold">{title}</p>
        {showBlockedVisual && blockedReason ? (
          <p className="text-caption text-ink-muted">Zavisi od: {blockedReason}</p>
        ) : institution ? (
          <p className="text-caption text-ink-muted">{institution}</p>
        ) : null}
      </div>

      {!showBlockedVisual && (
        <>
          {status === 'todo' && <Badge variant="optional">Nije počelo</Badge>}
          {status === 'in-progress' && <Badge variant="warning">U toku</Badge>}
          {status === 'done' && <Badge variant="success">Završeno</Badge>}
        </>
      )}
    </div>
  );
}