// Search term limits, shared by the API schema and the SearchField, which
// checks them in the browser before navigating (08 P1, P2).
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 200;

/** True when the trimmed term is long enough to send (08 P1: "≥ 2 characters after trim"). */
export function isSearchTermLongEnough(term: string): boolean {
  return term.trim().length >= SEARCH_MIN_LENGTH;
}
