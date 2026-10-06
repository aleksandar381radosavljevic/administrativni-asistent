// components/admin/AdminSidebar.tsx
// Sidebar sa navigacijom

'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, FileText, Users, Building2, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createSupabaseClient } from '@/lib/supabase/clients';

interface AdminSidebarProps {
  user: User;
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  const navItems = [
    { href: '/admin', icon: '📊', label: 'Dashboard' },
    { href: '/admin/life-events', icon: FileText, label: 'Životni događaji' },
    { href: '/admin/procedures', icon: Users, label: 'Procedure' },
    { href: '/admin/institutions', icon: Building2, label: 'Institucije' },
    { href: '/admin/ai-queries', icon: MessageSquare, label: 'AI upiti' },
    { href: '/admin/warnings', icon: AlertTriangle, label: 'Upozorenja' },
  ];

  return (
    <div className="w-64 bg-ink text-paper flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-ink-muted">
        <h2 className="text-title font-bold">AA Admin</h2>
        <p className="text-caption text-ink-muted">v1.0</p>
      </div>

      {/* Navigacija */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-amber text-paper'
                    : 'text-paper/70 hover:text-paper hover:bg-paper/10'
                }`}
              >
                {typeof item.icon === 'string' ? (
                  <span className="text-lg">{item.icon}</span>
                ) : (
                  <item.icon className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Footer - Korisnik i logout */}
      <div className="p-4 border-t border-ink-muted">
        <p className="text-xs text-ink-muted mb-3">Prijavljen kao</p>
        <p className="text-sm font-semibold text-paper truncate mb-4">
          {user.email}
        </p>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleLogout}
          className="w-full flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Odjavi se
        </Button>
      </div>
    </div>
  );
}