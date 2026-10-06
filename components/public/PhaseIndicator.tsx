// components/public/PhaseIndicator.tsx
// Vizuelni indikator faze sa linijom

interface PhaseIndicatorProps {
  phase: number;
  isActive?: boolean;
}

export function PhaseIndicator({ phase, isActive = true }: PhaseIndicatorProps) {
  const phaseLabels = {
    1: 'mogu odmah, paralelno',
    2: 'kreni kad završiš Fazu 1',
    3: 'kreni kad završiš Fazu 2',
    4: 'kreni kad završiš Fazu 3',
  };

  return (
    <div className="relative mb-6 pl-8">
      {/* Linija (nije vidljiva na poslednjoj fazi) */}
      <div
        className={`absolute left-3 top-8 bottom-0 w-1 rounded-full ${
          isActive ? 'bg-amber/35' : 'bg-clay-dark'
        }`}
      />

      {/* Marker */}
      <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full font-bold text-white text-sm" 
        style={{
          backgroundColor: isActive ? '#e8743b' : '#dcd0bb',
        }}>
        {phase}
      </div>

      {/* Label */}
      <p className="text-caption font-bold text-amber">
        Faza {phase}
        <span className="font-normal text-ink-muted"> · {phaseLabels[phase as keyof typeof phaseLabels] || ''}</span>
      </p>
    </div>
  );
}