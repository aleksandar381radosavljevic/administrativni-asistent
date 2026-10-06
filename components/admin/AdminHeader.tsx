// components/admin/AdminHeader.tsx
// Header sa kontekstualnim informacijama

import { User } from '@supabase/supabase-js';

interface AdminHeaderProps {
  user: User;
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <div className="bg-paper border-b border-clay px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title font-bold text-ink">
            Administratorski panel
          </h1>
          <p className="text-caption text-ink-muted">
            Upravljanje sadržajem - {new Date().toLocaleDateString('sr-RS')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-ink-muted">{user.email}</p>
        </div>
      </div>
    </div>
  );
}