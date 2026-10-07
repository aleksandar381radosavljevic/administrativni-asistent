// Cache tags for public reads (04 §3.2). Pages tag cached reads with these
// and admin write handlers invalidate them, so a change is visible at once
// (UF-09). `catalog` covers list views (home, categories, institution list)
// and the AI content catalog, which holds titles, slugs and synonyms (04 §4.3).
export const CATALOG_TAG = "catalog";

export const lifeEventTag = (id: string) => `life-event:${id}`;
export const procedureTag = (id: string) => `procedure:${id}`;
export const institutionTag = (id: string) => `institution:${id}`;

/** Tags of one write: the catalog plus every entity whose public view changed. */
export function writeTags(related: {
  lifeEventIds?: Iterable<string>;
  procedureIds?: Iterable<string>;
  institutionIds?: Iterable<string>;
}): string[] {
  const tags = new Set<string>([CATALOG_TAG]);
  for (const id of related.lifeEventIds ?? []) tags.add(lifeEventTag(id));
  for (const id of related.procedureIds ?? []) tags.add(procedureTag(id));
  for (const id of related.institutionIds ?? []) tags.add(institutionTag(id));
  return [...tags];
}
