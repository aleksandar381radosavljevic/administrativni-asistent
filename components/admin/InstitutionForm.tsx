// components/admin/InstitutionForm.tsx
// CRUD forma za institucije

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/Alert';
import { InstitutionWrite } from '@/types/api';

interface InstitutionFormProps {
  initialData?: Partial<InstitutionWrite>;
  onSubmit: (data: InstitutionWrite) => Promise<void>;
  isLoading?: boolean;
}

export function InstitutionForm({
  initialData,
  onSubmit,
  isLoading = false,
}: InstitutionFormProps) {
  const [formData, setFormData] = useState<InstitutionWrite>({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    website: initialData?.website || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    working_hours: initialData?.working_hours || '',
    status: initialData?.status || 'draft',
  });

  const [error, setError] = useState<string | null>(null);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Naziv institucije je obavezan');
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
        <Label htmlFor="name">Naziv institucije</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={handleNameChange}
          placeholder="npr. Ministarstvo unutrašnjih poslova"
          required
        />
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          id="status"
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'archived' })
          }
        >
          <option value="draft">Nacrt</option>
          <option value="published">Objavljeno</option>
          <option value="archived">Arhivirano</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Opis</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="website">Vebsajt</Label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div>
        <Label htmlFor="phone">Telefon</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+381 11 123 4567"
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="info@institucija.rs"
        />
      </div>

      <div>
        <Label htmlFor="hours">Radno vreme</Label>
        <Input
          id="hours"
          value={formData.working_hours}
          onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
          placeholder="Ponedeljak - Petak 8:00 - 16:00"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Čuvam...' : 'Sačuvaj'}
        </Button>
        <Button type="button" variant="ghost">
          Otkaži
        </Button>
      </div>
    </form>
  );
}