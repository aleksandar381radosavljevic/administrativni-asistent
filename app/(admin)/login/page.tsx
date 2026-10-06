// app/(admin)/login/page.tsx
// Login stranica

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/Alert';
import { createSupabaseClient } from '@/lib/supabase/clients';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Neispravna email adresa ili lozinka');
        return;
      }

      router.push('/admin');
    } catch (err) {
      setError('Greška pri prijavi. Pokušajte ponovo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ink mb-2">
            Administrativni Asistent
          </h1>
          <p className="text-ink-muted">Admin panel</p>
        </div>

        {/* Forma */}
        <form onSubmit={handleSubmit} className="bg-paper p-8 rounded-xl shadow-lg space-y-6">
          {error && (
            <Alert type="error" title="Greška pri prijavi">
              {error}
            </Alert>
          )}

          <div>
            <Label htmlFor="email">Email adresa</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@administrativniasistent.rs"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="password">Lozinka</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Prijavljivanje...' : 'Prijavi se'}
          </Button>

          <p className="text-center text-caption text-ink-muted">
            Pristup administratorskom panelu se dodeljuje ručno. Kontaktirajte administratora.
          </p>
        </form>
      </div>
    </div>
  );
}