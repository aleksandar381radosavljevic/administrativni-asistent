// components/admin/ProcedureForm.tsx
// CRUD forma za procedure – bez life_event_id i dependencies (upravlja se kroz admin/life-events/{id}/procedures i admin/procedures/{id}/dependencies)

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert } from '@/components/ui/Alert';
import { Plus, Trash2 } from 'lucide-react';
import { ProcedureWrite, StepWrite, DocumentWrite } from '@/types/api';

interface ProcedureFormProps {
  initialData?: Partial<ProcedureWrite>;
  institutions: Array<{ id: string; name: string }>;
  onSubmit: (data: ProcedureWrite) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ProcedureForm({
  initialData,
  institutions,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProcedureFormProps) {
  const [formData, setFormData] = useState<ProcedureWrite>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    institution_ids: initialData?.institution_ids || [],
    can_online: initialData?.can_online || false,
    can_in_person: initialData?.can_in_person || true,
    can_by_mail: initialData?.can_by_mail || false,
    cost_amount: initialData?.cost_amount,
    cost_description: initialData?.cost_description || '',
    processing_time: initialData?.processing_time || '',
    official_link: initialData?.official_link || '',
    form_link: initialData?.form_link || '',
    status: initialData?.status || 'draft',
    last_verified_at: initialData?.last_verified_at,
    steps: initialData?.steps || [],
    documents: initialData?.documents || [],
  });

  const [error, setError] = useState<string | null>(null);
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>(
    initialData?.institution_ids || []
  );

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

  const toggleInstitution = (id: string) => {
    const updated = selectedInstitutions.includes(id)
      ? selectedInstitutions.filter((x) => x !== id)
      : [...selectedInstitutions, id];
    setSelectedInstitutions(updated);
    setFormData({ ...formData, institution_ids: updated });
  };

  const addStep = () => {
    const newStep: StepWrite = {
      sort_order: (formData.steps?.length || 0) + 1,
      title: '',
      description: '',
      link_url: undefined,
      link_label: undefined,
    };
    setFormData({
      ...formData,
      steps: [...(formData.steps || []), newStep],
    });
  };

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps?.filter((_, i) => i !== index) || [],
    });
  };

  const updateStep = (index: number, step: Partial<StepWrite>) => {
    const updated = [...(formData.steps || [])];
    updated[index] = { ...updated[index], ...step };
    setFormData({ ...formData, steps: updated });
  };

  const addDocument = () => {
    const newDoc: DocumentWrite = {
      sort_order: (formData.documents?.length || 0) + 1,
      name: '',
      description: '',
      is_required: false,
      note: undefined,
    };
    setFormData({
      ...formData,
      documents: [...(formData.documents || []), newDoc],
    });
  };

  const removeDocument = (index: number) => {
    setFormData({
      ...formData,
      documents: formData.documents?.filter((_, i) => i !== index) || [],
    });
  };

  const updateDocument = (index: number, doc: Partial<DocumentWrite>) => {
    const updated = [...(formData.documents || [])];
    updated[index] = { ...updated[index], ...doc };
    setFormData({ ...formData, documents: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validacija (PR-01, PR-02, PR-03)
    if (!formData.title.trim()) {
      setError('Naslov je obavezan');
      return;
    }

    if (!formData.slug.trim()) {
      setError('Slug je obavezan');
      return;
    }

    if (!formData.can_online && !formData.can_in_person && !formData.can_by_mail) {
      setError('Minimalno jedna metoda izvršavanja je obavezna (online, lično ili poštom)');
      return;
    }

    if (!formData.steps || formData.steps.length === 0) {
      setError('Procedura mora imati najmanje jedan korak (PR-01)');
      return;
    }

    if (!formData.institution_ids || formData.institution_ids.length === 0) {
      setError('Procedura mora biti vezana za najmanje jednu instituciju (PR-02)');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri čuvanju procedure');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert type="error" title="Greška validacije">
          {error}
        </Alert>
      )}

      {/* Osnovne informacije */}
      <fieldset className="space-y-4 border-b-2 border-clay pb-6">
        <legend className="text-heading font-bold mb-2">Osnovne informacije</legend>

        <div>
          <Label htmlFor="title">Naslov procedure *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={handleTitleChange}
            placeholder="npr. Pribavljanje lične karte"
            required
          />
          <p className="text-caption text-ink-muted mt-1">Slug se generiše automatski</p>
        </div>

        <div>
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="pribavljanje-licne-karte"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Opis</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detaljniji opis šta procedura podrazumeva..."
            rows={4}
          />
        </div>
      </fieldset>

      {/* Metode izvršavanja (PR-03) */}
      <fieldset className="space-y-3 border-b-2 border-clay pb-6">
        <legend className="text-heading font-bold mb-2">Metode izvršavanja *</legend>
        <p className="text-caption text-ink-muted">Minimalno jedna metoda je obavezna</p>

        <div className="flex items-center gap-3">
          <Checkbox
            id="online"
            checked={formData.can_online}
            onChange={(e) => setFormData({ ...formData, can_online: e.currentTarget.checked })}
          />
          <Label htmlFor="online">Online</Label>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="in-person"
            checked={formData.can_in_person}
            onChange={(e) => setFormData({ ...formData, can_in_person: e.currentTarget.checked })}
          />
          <Label htmlFor="in-person">Lično (u službi)</Label>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="by-mail"
            checked={formData.can_by_mail}
            onChange={(e) => setFormData({ ...formData, can_by_mail: e.currentTarget.checked })}
          />
          <Label htmlFor="by-mail">Poštom</Label>
        </div>
      </fieldset>

      {/* Troškovi i vreme */}
      <fieldset className="space-y-4 border-b-2 border-clay pb-6">
        <legend className="text-heading font-bold mb-2">Troškovi i vreme obrade</legend>

        <div>
          <Label htmlFor="cost-amount">Cena (RSD)</Label>
          <Input
            id="cost-amount"
            type="number"
            value={formData.cost_amount || ''}
            onChange={(e) => setFormData({ ...formData, cost_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
            min="0"
            step="100"
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="cost-desc">Opis troška</Label>
          <Input
            id="cost-desc"
            value={formData.cost_description}
            onChange={(e) => setFormData({ ...formData, cost_description: e.target.value })}
            placeholder="npr. Bez naknade, Taksa 1.500 din, itd."
          />
        </div>

        <div>
          <Label htmlFor="processing-time">Vreme obrade</Label>
          <Input
            id="processing-time"
            value={formData.processing_time}
            onChange={(e) => setFormData({ ...formData, processing_time: e.target.value })}
            placeholder="npr. 1-3 radna dana"
          />
        </div>
      </fieldset>

      {/* Linkovi */}
      <fieldset className="space-y-4 border-b-2 border-clay pb-6">
        <legend className="text-heading font-bold mb-2">Zvanični linkovi</legend>

        <div>
          <Label htmlFor="official-link">Zvanični izvor</Label>
          <Input
            id="official-link"
            type="url"
            value={formData.official_link}
            onChange={(e) => setFormData({ ...formData, official_link: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div>
          <Label htmlFor="form-link">Formular / Zakazivanje</Label>
          <Input
            id="form-link"
            type="url"
            value={formData.form_link}
            onChange={(e) => setFormData({ ...formData, form_link: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </fieldset>

      {/* Institucije (PR-02) */}
      <fieldset className="space-y-3 border-b-2 border-clay pb-6">
        <legend className="text-heading font-bold mb-2">Relevantne institucije *</legend>
        <p className="text-caption text-ink-muted">Minimalno jedna institucija je obavezna</p>

        <div className="space-y-2">
          {institutions.map((inst) => (
            <div key={inst.id} className="flex items-center gap-3">
              <Checkbox
                id={`inst-${inst.id}`}
                checked={selectedInstitutions.includes(inst.id)}
                onChange={() => toggleInstitution(inst.id)}
              />
              <Label htmlFor={`inst-${inst.id}`}>{inst.name}</Label>
            </div>
          ))}
        </div>
      </fieldset>

      {/* Koraci (PR-01) */}
      <fieldset className="space-y-4 border-b-2 border-clay pb-6">
        <legend className="text-heading font-bold mb-2">Koraci procedure *</legend>
        <p className="text-caption text-ink-muted">Minimalno jedan korak je obavezan</p>

        {formData.steps && formData.steps.length > 0 && (
          <div className="space-y-3">
            {formData.steps.map((step, idx) => (
              <div key={idx} className="card-base space-y-3 border-l-4 border-amber pl-3">
                <div className="flex items-center justify-between">
                  <p className="text-body font-bold">Korak {step.sort_order}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Input
                  value={step.title}
                  onChange={(e) => updateStep(idx, { title: e.target.value })}
                  placeholder="Naslov koraka *"
                  required
                />

                <Textarea
                  value={step.description}
                  onChange={(e) => updateStep(idx, { description: e.target.value })}
                  placeholder="Opis akcije *"
                  rows={2}
                  required
                />

                <Input
                  value={step.link_url || ''}
                  onChange={(e) => updateStep(idx, { link_url: e.target.value || undefined })}
                  placeholder="https://... (opciono)"
                  type="url"
                />

                <Input
                  value={step.link_label || ''}
                  onChange={(e) => updateStep(idx, { link_label: e.target.value || undefined })}
                  placeholder="Tekst linka (npr. Zakaži termin online)"
                />
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addStep}
        >
          <Plus className="h-4 w-4 mr-2" />
          Dodaj korak
        </Button>
      </fieldset>

      {/* Dokumenta */}
      <fieldset className="space-y-4 border-b-2 border-clay pb-6">
        <legend className="text-heading font-bold mb-2">Potrebna dokumenta</legend>

        {formData.documents && formData.documents.length > 0 && (
          <div className="space-y-3">
            {formData.documents.map((doc, idx) => (
              <div key={idx} className="card-base space-y-3 border-l-4 border-sage pl-3">
                <div className="flex items-center justify-between">
                  <p className="text-body font-bold">Dokument {idx + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Input
                  value={doc.name}
                  onChange={(e) => updateDocument(idx, { name: e.target.value })}
                  placeholder="Naziv dokumenta *"
                  required
                />

                <Textarea
                  value={doc.description}
                  onChange={(e) => updateDocument(idx, { description: e.target.value })}
                  placeholder="Opis – gde se nabavlja, šta treba sadržati..."
                  rows={2}
                />

                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`required-${idx}`}
                    checked={doc.is_required}
                    onChange={(e) => updateDocument(idx, { is_required: e.currentTarget.checked })}
                  />
                  <Label htmlFor={`required-${idx}`}>Obavezno</Label>
                </div>

                <Input
                  value={doc.note || ''}
                  onChange={(e) => updateDocument(idx, { note: e.target.value || undefined })}
                  placeholder="Dodatna napomena"
                />
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addDocument}
        >
          <Plus className="h-4 w-4 mr-2" />
          Dodaj dokument
        </Button>
      </fieldset>

      {/* Poslednja provera */}
      <fieldset className="space-y-4 border-b-2 border-clay pb-6">
        <legend className="text-heading font-bold mb-2">Poslednja provera</legend>
        <p className="text-caption text-ink-muted">Procedure starije od 6 meseci prikazuju upozorenje korisnicima (PR-07)</p>

        <div>
          <Label htmlFor="last-verified">Datum poslednje provere</Label>
          <Input
            id="last-verified"
            type="datetime-local"
            value={formData.last_verified_at ? formData.last_verified_at.slice(0, 16) : ''}
            onChange={(e) => setFormData({ ...formData, last_verified_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          />
        </div>
      </fieldset>

      {/* Status */}
      <fieldset className="space-y-4 border-b-2 border-clay pb-6">
        <legend className="text-heading font-bold mb-2">Status</legend>

        <div>
          <Label htmlFor="status">Status publikovanja *</Label>
          <Select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'archived' })}
            required
          >
            <option value="draft">Nacrt – nisu vidljivi korisnicima</option>
            <option value="published">Objavljeno – vidljivo javno</option>
            <option value="archived">Arhivirano – povučeno, ostaje u bazi</option>
          </Select>
        </div>
      </fieldset>

      {/* Akcije */}
      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Čuvam...' : 'Sačuvaj proceduru'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Otkaži
        </Button>
      </div>

      {/* Napomena o zavisnostima */}
      <div className="bg-honey-soft border-l-4 border-honey p-3 rounded-md">
        <p className="text-caption font-bold text-ink mb-1">ℹ️ Zavisnosti između procedura</p>
        <p className="text-caption text-ink-muted">
          Zavisnosti se dodeljuju kao odvojena akcija nakon kreiranja procedure. Videti: Admin panel → Procedura → Zavisnosti.
        </p>
      </div>

      {/* Napomena o životnim događajima */}
      <div className="bg-sage-soft border-l-4 border-sage p-3 rounded-md">
        <p className="text-caption font-bold text-ink mb-1">ℹ️ Dodela životnom događaju</p>
        <p className="text-caption text-ink-muted">
          Procedura se vezuje za životni događaj kroz admin panel životnog događaja, ne kroz formu procedure. Ova procedura može biti deo više životnih događaja.
        </p>
      </div>
    </form>
  );
}