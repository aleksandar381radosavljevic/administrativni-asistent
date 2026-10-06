// components/admin/LifeEventForm.tsx
// CRUD forma za životne događaje

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/Alert';
import { LifeEventWrite } from '@/types/api';

interface LifeEventFormProps {
  initialData?: Partial<LifeEventWrite>;
  categories: Array<{ id: string; name: string }>;
  onSubmit: (data: LifeEventWrite) => Promise<void>;
  isLoading?: boolean;
}

export function LifeEventForm({
  initialData,
  categories,
  onSubmit,
  isLoading = false,
}: LifeEventFormProps) {
  const [formData, setFormData] = useState<LifeEventWrite>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    icon: initialData?.icon || '📋',
    category_id: initialData?.category_id || '',
    status: initialData?.status || 'draft',
  });

  const [error, setError] = useState<string | null>(null);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Naslov je obavezan');
      return;
    }

    if (!formData.category_id) {
      setError('Kategorija je obavezna');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri čuvanju');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert type="error" title="Greška">{error}</Alert>}

      <div>
        <Label htmlFor="title">Naslov životnog događaja</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={handleTitleChange}
          placeholder="npr. Pribavljanje lične karte"
          required
        />
      </div>

      <div>
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          disabled
          className="opacity-60"
        />
        <p className="text-caption text-ink-muted mt-1">Automatski generisan iz naslova</p>
      </div>

      <div>
        <Label htmlFor="icon">Emoji ikona</Label>
        <Input
          id="icon"
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          maxLength={2}
          placeholder="📋"
        />
      </div>

      <div>
        <Label htmlFor="category">Kategorija</Label>
        <Select
          id="category"
          value={formData.category_id}
          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          required
        >
          <option value="">-- Odaberi kategoriju --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Opis</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detaljniji opis ovog životnog događaja..."
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          id="status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'archived' })}
        >
          <option value="draft">Nacrt</option>
          <option value="published">Objavljeno</option>
          <option value="archived">Arhivirano</option>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Čuvam...' : 'Sačuvan'}
        </Button>
        <Button type="button" variant="ghost">
          Otkaži
        </Button>
      </div>
    </form>
  );
}