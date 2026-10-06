// components/admin/AdminDataTable.tsx
// Generička data table komponenta za admin liste

import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

interface AdminDataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  editLink?: (id: string) => string;
  isLoading?: boolean;
}

export function AdminDataTable<T extends { id: string }>({
  data,
  columns,
  onDelete,
  editLink,
  isLoading,
}: AdminDataTableProps<T>) {
  if (isLoading) {
    return <div className="text-center py-8 text-ink-muted">Učitavanja...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 bg-paper rounded-lg">
        <p className="text-ink-muted">Nema podataka</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-clay border-b border-clay-dark">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-6 py-3 text-left text-caption font-bold text-ink uppercase"
              >
                {col.label}
              </th>
            ))}
            <th className="px-6 py-3 text-caption font-bold text-ink uppercase">
              Akcije
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              className="border-b border-clay hover:bg-cream transition-colors"
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-6 py-4 text-body text-ink">
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key])}
                </td>
              ))}
              <td className="px-6 py-4 space-x-2 flex">
                {editLink && (
                  <Link href={editLink(row.id)}>
                    <Button variant="secondary" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                {onDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}