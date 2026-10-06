// lib/utils/api.ts
// API utility funkcije za response formatiranje i error handling

import { ErrorResponse, ValidationErrorResponse } from '@/types/api';
import { NextResponse } from 'next/server';

/**
 * Standardizovani error response
 */
export function apiError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  status: number = 500
) {
  const error: ErrorResponse = {
    error: code,
    message,
  };

  if (details) {
    error.details = details;
  }

  return NextResponse.json(error, { status });
}

/**
 * Validation error response
 */
export function validationError(
  fields: Array<{ field: string; message: string }>
) {
  const error: ValidationErrorResponse = {
    error: 'validation_error',
    message: 'Validacija nije prošla.',
    details: fields,
  };

  return NextResponse.json(error, { status: 422 });
}

/**
 * Bad request error
 */
export function badRequest(message: string) {
  return apiError('bad_request', message, undefined, 400);
}

/**
 * Not found error
 */
export function notFound(message: string = 'Traženi resurs nije pronađen.') {
  return apiError('not_found', message, undefined, 404);
}

/**
 * Unauthorized error
 */
export function unauthorized(
  message: string = 'Autentifikacija je potrebna za ovu akciju.'
) {
  return apiError('unauthorized', message, undefined, 401);
}

/**
 * Forbidden error
 */
export function forbidden(
  message: string = 'Nemate dozvolu za ovu akciju.'
) {
  return apiError('forbidden', message, undefined, 403);
}

/**
 * Rate limit error
 */
export function rateLimited(
  message: string = 'Previše zahteva. Pokušajte ponovo kasnije.'
) {
  return apiError('rate_limited', message, undefined, 429);
}

/**
 * Internal server error
 */
export function internalError(
  message: string = 'Došlo je do greške. Pokušajte ponovo.'
) {
  return apiError('internal_error', message, undefined, 500);
}

/**
 * Success response
 */
export function success<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Created response (201)
 */
export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

/**
 * No content response (204)
 */
export function noContent() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Validacija da li je string minimalne dužine
 */
export function validateMinLength(
  value: string,
  min: number,
  fieldName: string
): string | null {
  if (!value || value.trim().length < min) {
    return `${fieldName} mora imati najmanje ${min} karaktera.`;
  }
  return null;
}

/**
 * Validacija da li je string maksimalne dužine
 */
export function validateMaxLength(
  value: string,
  max: number,
  fieldName: string
): string | null {
  if (value && value.length > max) {
    return `${fieldName} ne sme biti duži od ${max} karaktera.`;
  }
  return null;
}

/**
 * Validacija URL-a
 */
export function validateUrl(value: string, fieldName: string): string | null {
  if (!value) return null;

  try {
    new URL(value);
    return null;
  } catch {
    return `${fieldName} nije validan URL.`;
  }
}

/**
 * Validacija email-a
 */
export function validateEmail(
  value: string,
  fieldName: string = 'Email'
): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (value && !emailRegex.test(value)) {
    return `${fieldName} nije validan.`;
  }
  return null;
}

/**
 * Validacija da li je polje obavezno
 */
export function validateRequired(value: unknown, fieldName: string): string | null {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return `${fieldName} je obavezno.`;
  }
  return null;
}

/**
 * Validacija da li je barem jedan od Boolean polja true (za procedure)
 */
export function validateAtLeastOneMethod(
  canOnline: boolean,
  canInPerson: boolean,
  canByMail: boolean
): string | null {
  if (!canOnline && !canInPerson && !canByMail) {
    return 'Procedura mora imati označenu bar jednu metodu obavljanja (Online, Lično ili Poštom).';
  }
  return null;
}

/**
 * Slug generator (iz title-a)
 * "Moj Naslov" → "moj-naslov"
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Uklanja specijalne karaktere
    .replace(/\s+/g, '-') // Zamenjuje razmake sa crticama
    .replace(/-+/g, '-') // Deduplicira crtice
    .replace(/^-+|-+$/g, ''); // Uklanja crtice sa početka i kraja
}

/**
 * Formatiranje cene
 * 1500 → "1.500 din"
 */
export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return 'Besplatno';
  }
  return `${amount.toLocaleString('sr-RS')} din`;
}

/**
 * Formatiranje datuma
 * "2026-06-15T10:30:00Z" → "15. jun 2026"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const formatter = new Intl.DateTimeFormat('sr-RS', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return formatter.format(date);
}

/**
 * Formatiranje vremenske razlike
 * new Date() vs "2026-03-15T10:30:00Z" → "3 meseca"
 */
export function formatTimeDifference(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffMonths / 12);

  if (diffYears > 0) {
    return `${diffYears} ${diffYears === 1 ? 'godina' : 'godina'} unazad`;
  }
  if (diffMonths > 0) {
    return `${diffMonths} ${diffMonths === 1 ? 'mesec' : 'meseci'} unazad`;
  }
  if (diffDays > 0) {
    return `${diffDays} ${diffDays === 1 ? 'dan' : 'dana'} unazad`;
  }
  return 'Danas';
}

/**
 * Provera da li je procedura zastarela (> 6 meseci bez provere)
 */
export function isStale(lastVerifiedAt: string | null): boolean {
  if (!lastVerifiedAt) return true;

  const verifiedDate = new Date(lastVerifiedAt);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return verifiedDate < sixMonthsAgo;
}

/**
 * Formatiranje procedure metoda u čitljiv string
 * { online: true, inPerson: true } → "Online, Lično"
 */
export function formatMethods(
  canOnline: boolean,
  canInPerson: boolean,
  canByMail: boolean
): string {
  const methods = [];
  if (canOnline) methods.push('Online');
  if (canInPerson) methods.push('Lično');
  if (canByMail) methods.push('Poštom');
  return methods.join(', ');
}
