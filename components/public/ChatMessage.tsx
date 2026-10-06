// components/public/ChatMessage.tsx
// Poruka u AI chatu

type MessageType = 'user' | 'ai';

interface ChatMessageProps {
  type: MessageType;
  content: string;
  relatedProcedures?: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
}

export function ChatMessage({
  type,
  content,
  relatedProcedures,
}: ChatMessageProps) {
  if (type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-xs rounded-3xl rounded-tr-sm bg-amber px-4 py-3 text-sm text-paper font-medium">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-xs rounded-3xl rounded-tl-sm bg-paper px-4 py-3 text-sm text-ink shadow-sm">
        <p className="whitespace-pre-wrap">{content}</p>

        {relatedProcedures && relatedProcedures.length > 0 && (
          <div className="mt-3 space-y-2">
            {relatedProcedures.map((proc) => (
              <a
                key={proc.id}
                href={`/procedure/${proc.slug}`}
                className="block rounded-lg bg-cream p-2 text-xs text-ink hover:bg-clay focus-ring"
              >
                <p className="font-semibold">{proc.title}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}