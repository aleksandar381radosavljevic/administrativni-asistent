// components/public/SearchBar.tsx
// Polje za pretragu sa ikonom

"use client"

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value: initialValue = '',
  onChange,
  placeholder = 'Pretraži… npr. pasoš, selidba',
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange?.(newValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
      <Input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-12"
      />
    </form>
  );
}