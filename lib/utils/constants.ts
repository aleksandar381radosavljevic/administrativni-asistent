// lib/utils/constants.ts
// Konstante koje se koriste u API-jima

/**
 * Rate limiting
 */
export const RATE_LIMITS = {
    AI_CHAT: {
        requests: 10,
        windowMs: 3600000, // 1 sat
    },
} as const;

/**
 * Dužine stringova
 */
export const STRING_LENGTHS = {
    SEARCH_QUERY: { min: 2, max: 100 },
    AI_MESSAGE: { min: 3, max: 1000 },
    TITLE: { min: 3, max: 200 },
    SLUG: { min: 3, max: 200 },
    DESCRIPTION: { max: 5000 },
    STEP_TITLE: { max: 300 },
    STEP_DESCRIPTION: { max: 2000 },
    DOCUMENT_NAME: { max: 300 },
} as const;

/**
 * Status vrednosti
 */
export const CONTENT_STATUSES = ['draft', 'published', 'archived'] as const;

/**
 * Audit akcije
 */
export const AUDIT_ACTIONS = ['create', 'update', 'archive'] as const;

/**
 * Stale threshold (meseci bez provere)
 */
export const STALE_THRESHOLD_MONTHS = 6;

/**
 * Pagination default
 */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
