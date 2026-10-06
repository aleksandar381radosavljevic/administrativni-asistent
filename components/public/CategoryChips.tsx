// components/public/CategoryChips.tsx
// Filter chipovi po kategorijama

interface CategoryChip {
  id: string;
  name: string;
  slug: string;
}

interface CategoryChipsProps {
  chips: CategoryChip[];
  selectedSlug?: string;
  onSelect?: (slug: string) => void;
}

export function CategoryChips({
  chips,
  selectedSlug,
  onSelect,
}: CategoryChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onSelect?.(chip.slug)}
          className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all focus-ring ${
            selectedSlug === chip.slug
              ? 'bg-amber text-paper'
              : 'bg-paper text-ink-muted shadow-sm'
          }`}
        >
          {chip.name}
        </button>
      ))}
    </div>
  );
}