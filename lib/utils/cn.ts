// lib/utils/cn.ts
// Class name utility - kombinovanje Tailwind klasa

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Kombinovanje Tailwind klasa sa automatskim rešavanjem konflikta
 * cn('px-2', 'px-4') → 'px-4' (umesto dva px vrednosti)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
