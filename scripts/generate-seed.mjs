#!/usr/bin/env node
// Generates supabase/seed.sql from the prototype's seed file plus the slice
// content that the new schema needs (ADR 0015). Run with `npm run seed:generate`.
//
// Why generated instead of hand-written: the seed must stay reproducible from
// its sources, and every rule (the "[TEST] " prefix, cost mapping, publish
// order) lives in one place instead of being repeated in hundreds of lines.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_DIR = join(ROOT, "supabase", "seed");
const OUTPUT = join(ROOT, "supabase", "seed.sql");
const TEST_PREFIX = "[TEST] ";

const prototype = JSON.parse(
  readFileSync(join(SEED_DIR, "prototype-seed-data.json"), "utf8"),
);
const slice = JSON.parse(
  readFileSync(join(SEED_DIR, "slice-content.json"), "utf8"),
);

// Deterministic, RFC 9562-shaped UUIDs (version 4, variant 8) so ids are stable
// across regenerations and pass strict UUID validators.
const ID_PREFIX = {
  category: "10000000",
  institution: "20000000",
  life_event: "30000000",
  procedure: "40000000",
  step: "50000000",
  document: "60000000",
  synonym: "70000000",
};
const uuid = (kind, n) =>
  `${ID_PREFIX[kind]}-0000-4000-8000-${String(n).padStart(12, "0")}`;
// "cat-001" -> 1
const seq = (sourceId) => Number(sourceId.split("-").pop());

const sql = (value) => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
};
const row = (values) => `  (${values.map(sql).join(", ")})`;
const insert = (table, columns, rows) =>
  rows.length === 0
    ? ""
    : `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n${rows.map(row).join(",\n")};\n`;

function requireKnown(kind, id, known) {
  if (!known.has(id))
    throw new Error(`slice-content.json: unknown ${kind} ${id}`);
}

// ---- Select what the slice publishes -----------------------------------------
// A life event can be published only with a published procedure (PR-04), and
// the prototype file links none, so only events mapped in slice-content.json
// are included. Categories and institutions follow from what is used.

const eventIds = new Set(Object.keys(slice.life_event_procedures));
const events = prototype.life_events.filter((e) => eventIds.has(e.id));
const procedureIds = new Set(Object.values(slice.life_event_procedures).flat());
const procedures = prototype.procedures.filter((p) => procedureIds.has(p.id));
const categoryIds = new Set(events.map((e) => e.category_id));
const categories = prototype.categories.filter((c) => categoryIds.has(c.id));
const institutionIds = new Set(
  Object.values(slice.procedure_institutions)
    .flat()
    .map((link) => link.institution),
);
const institutions = prototype.institutions.filter((i) =>
  institutionIds.has(i.id),
);

for (const id of eventIds)
  requireKnown("life event", id, new Set(events.map((e) => e.id)));
for (const id of procedureIds)
  requireKnown("procedure", id, new Set(procedures.map((p) => p.id)));
for (const id of institutionIds)
  requireKnown("institution", id, new Set(institutions.map((i) => i.id)));
for (const p of procedures) {
  if (!slice.steps[p.id]?.length)
    throw new Error(`${p.id} needs at least one step (PR-01)`);
  if (!slice.procedure_institutions[p.id]?.length)
    throw new Error(`${p.id} needs an institution (PR-02)`);
}

// ---- Map prototype fields to the new schema -----------------------------------

// ADR 0008: an empty or zero amount no longer means "free"; the prototype used
// 0 for free procedures, so 0 maps to free and any positive amount to fixed.
function cost(p) {
  if (p.cost_amount === null || p.cost_amount === undefined) {
    return {
      type: "unknown",
      amount: null,
      description: p.cost_description ?? null,
    };
  }
  if (p.cost_amount === 0)
    return { type: "free", amount: null, description: null };
  return {
    type: "fixed",
    amount: p.cost_amount.toFixed(2),
    description: p.cost_description ?? null,
  };
}

const verifiedAt = (date) => (date ? `${date}T00:00:00Z` : null);

const categoryRows = categories.map((c) => [
  uuid("category", seq(c.id)),
  TEST_PREFIX + c.name,
  c.slug,
  slice.icons[c.id] ?? null,
  c.sort_order,
]);

const institutionRows = institutions.map((i) => [
  uuid("institution", seq(i.id)),
  TEST_PREFIX + i.name,
  i.slug,
  slice.institution_kinds[i.id] ?? "other",
  i.description ?? null,
  i.website ?? null,
  i.phone ?? null,
  i.email ?? null,
  i.working_hours ?? null,
  "published",
]);

const procedureRows = procedures.map((p) => {
  const c = cost(p);
  return [
    uuid("procedure", seq(p.id)),
    TEST_PREFIX + p.title,
    p.description ?? null,
    p.slug,
    p.can_online,
    p.can_in_person,
    p.can_by_mail,
    c.type,
    c.amount,
    c.description,
    p.processing_time ?? null,
    p.official_link ?? null,
    p.form_link ?? null,
    verifiedAt(p.last_verified_at),
  ];
});

let stepSeq = 0;
const stepRows = procedures.flatMap((p) =>
  slice.steps[p.id].map((s, index) => [
    uuid("step", ++stepSeq),
    uuid("procedure", seq(p.id)),
    index + 1,
    s.title,
    s.description,
  ]),
);

let documentSeq = 0;
const documentRows = procedures.flatMap((p) =>
  (slice.documents[p.id] ?? []).map((d, index) => [
    uuid("document", ++documentSeq),
    uuid("procedure", seq(p.id)),
    d.name,
    d.is_required,
    d.note ?? null,
    index + 1,
  ]),
);

const procedureInstitutionRows = procedures.flatMap((p) =>
  slice.procedure_institutions[p.id].map((link) => [
    uuid("procedure", seq(p.id)),
    uuid("institution", seq(link.institution)),
    link.note ?? null,
  ]),
);

const eventRows = events.map((e) => [
  uuid("life_event", seq(e.id)),
  uuid("category", seq(e.category_id)),
  TEST_PREFIX + e.title,
  e.description ?? null,
  slice.icons[e.id] ?? null,
  e.slug,
  e.sort_order,
]);

const linkRows = events.flatMap((e) =>
  slice.life_event_procedures[e.id].map((procedureId, index) => [
    uuid("life_event", seq(e.id)),
    uuid("procedure", seq(procedureId)),
    index + 1,
  ]),
);

const dependencyRows = slice.dependencies.map((d) => {
  if (
    !slice.life_event_procedures[d.life_event]?.includes(d.procedure) ||
    !slice.life_event_procedures[d.life_event]?.includes(d.depends_on)
  ) {
    throw new Error(
      `dependency ${d.procedure} -> ${d.depends_on} is not inside ${d.life_event}`,
    );
  }
  return [
    uuid("life_event", seq(d.life_event)),
    uuid("procedure", seq(d.procedure)),
    uuid("procedure", seq(d.depends_on)),
  ];
});

const synonymRows = slice.synonyms.map((s, index) => [
  uuid("synonym", index + 1),
  s.term,
  s.maps_to,
]);

const idList = (rows) => rows.map((r) => sql(r[0])).join(", ");

// ---- Write ---------------------------------------------------------------------
// Rows are inserted as drafts and published at the end, one statement per
// table. Why: the publish rules are deferred constraint triggers, and seeding
// must work whether the runner wraps the file in one transaction or runs each
// statement on its own.

const output = `-- =============================================================================
-- TEST DATA ONLY (ADR 0015). Generated by scripts/generate-seed.mjs; do not edit.
-- Sources: supabase/seed/prototype-seed-data.json (prototype, unverified) and
-- supabase/seed/slice-content.json (fictional steps, documents and links).
-- Costs, deadlines and contacts are invented or unverified. Every category,
-- institution, life event and procedure title starts with "${TEST_PREFIX.trim()}".
-- Loaded locally, in CI and on staging; never in production.
-- =============================================================================

${insert("categories", ["id", "name", "slug", "icon", "sort_order"], categoryRows)}
${insert(
  "institutions",
  [
    "id",
    "name",
    "slug",
    "kind",
    "description",
    "website",
    "phone",
    "email",
    "working_hours",
    "status",
  ],
  institutionRows,
)}
${insert(
  "procedures",
  [
    "id",
    "title",
    "description",
    "slug",
    "can_online",
    "can_in_person",
    "can_by_mail",
    "cost_type",
    "cost_amount",
    "cost_description",
    "processing_time",
    "official_link",
    "form_link",
    "last_verified_at",
  ],
  procedureRows,
)}
${insert("steps", ["id", "procedure_id", "sort_order", "title", "description"], stepRows)}
${insert("documents", ["id", "procedure_id", "name", "is_required", "note", "sort_order"], documentRows)}
${insert("procedure_institutions", ["procedure_id", "institution_id", "note"], procedureInstitutionRows)}
${insert(
  "life_events",
  ["id", "category_id", "title", "description", "icon", "slug", "sort_order"],
  eventRows,
)}
${insert("life_event_procedures", ["life_event_id", "procedure_id", "sort_order"], linkRows)}
${insert("procedure_dependencies", ["life_event_id", "procedure_id", "depends_on_id"], dependencyRows)}
${insert("synonyms", ["id", "term", "maps_to"], synonymRows)}
-- Publish: procedures first (they have steps and an institution), then the
-- life events (each now has a published procedure, PR-04).
UPDATE procedures SET status = 'published' WHERE id IN (${idList(procedureRows)});
UPDATE life_events SET status = 'published' WHERE id IN (${idList(eventRows)});
`;

writeFileSync(OUTPUT, output.replace(/\n{3,}/g, "\n\n"));
console.log(
  `Wrote ${OUTPUT}: ${categoryRows.length} categories, ${institutionRows.length} institutions, ` +
    `${eventRows.length} life events, ${procedureRows.length} procedures.`,
);
