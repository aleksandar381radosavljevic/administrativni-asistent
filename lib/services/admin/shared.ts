import type { PaginationQuery } from "../schemas";

/** A write's response body and the cache tags it invalidates (04 §3.2). */
export interface WriteResult<T> {
  body: T;
  tags: string[];
}

export function pageOf(query: PaginationQuery, count: number | null) {
  return { total: count ?? 0, limit: query.limit, offset: query.offset };
}

/** The inclusive range() bounds of one page. */
export function rangeOf(query: PaginationQuery): [number, number] {
  return [query.offset, query.offset + query.limit - 1];
}
